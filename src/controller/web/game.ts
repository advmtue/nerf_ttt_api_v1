// Modules
import { Application, Request, Response } from 'express';

// Libs
import { logger } from '../../lib/logger';
import * as apiResponse from '../../lib/apiresponse';

// Associated controllers
import { GameManager } from '../game';
import { Database } from '../database';

// Base class
import { ExpressController } from './index';

export class ExpressGameMiddleware {

	constructor(
		protected all: ExpressController,
		protected app: Application,
		protected gc: GameManager,
		protected db: Database
	) {
		// Get game
		app.get('/game/:gameId', [all.auth.checkAuth, this.getGame]);

		// Player - Join / leave
		app.put('/game/:gameId/join', [all.auth.checkAuth, this.joinGame]);
		app.put('/game/:gameId/leave', [all.auth.checkAuth, this.leaveGame]);

		// Player - Ready / Unready
		app.put('/game/:gameId/ready', [all.auth.checkAuth, this.playerReady]);
		app.put('/game/:gameId/unready', [all.auth.checkAuth, this.playerUnready]);

		// Close by owner
		// Close by admin
		app.delete('/game/:gameId/admin', [all.auth.checkAuth, this.adminClose]);

		// Owner starts the game
		app.put('/game/:gameId/start', [all.auth.checkAuth, this.startGame]);

		// Create new game
		app.post('/game', [all.auth.checkAuth, this.newGame]);
	}

	/**
	 * Create a new game in the lobby phase
	 */
	newGame = async (request: Request, response: Response) => {
		const { name } = request.body;

		if (!name) {
			response.send(apiResponse.httpError(400));
			return;
		}

		try {
			const p = await this.db.player.hasPermission(request.player.id, 'createLobby');
			if (!p) {
				throw new Error('Bad permissions.');
			}
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(1, error.message))
			return;
		}

		try {
			const g = await this.db.game.create(name, request.player.id);

			// Yeet
			this.gc.addGame(g);

			response.send(apiResponse.success(g));
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(1, error.message));
		}
	}

	startGame = async (request: Request, response: Response) => {
		const gameId = Number(request.params.gameId);

		// Try to stat a game
		try {
			this.gc.playerStartGame(gameId, request.player);
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(2, error.message));
			return;
		}

		// It started, assume the sockets did some things
		response.send(apiResponse.success());
	}

	/**
	 * Admin attempts to force close the lobby
	 */
	adminClose = async (request: Request, response: Response) => {
		const gameId = Number(request.params.gameId);

		// Ensure we have permissions after this code block
		try {
			const p = await this.db.player.hasPermission(request.player.id, 'createLobby');

			if (!p) {
				response.send(apiResponse.error(1, 'Insufficient permissions'));
				return;
			}
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.httpError(500));
			return;
		}

		// Close it in the database
		try {
			await this.db.game.adminClose(gameId);
		} catch (error) {
			// Game probably doesn't exist
			logger.error(error);
			response.send(apiResponse.httpError(500))
			return;
		}

		// Close it in the GC (if it exists)
		try {
			this.gc.adminClose(gameId);
		} catch (error) {
			logger.error(error);

			if (error.message !== 'Game not found') {
				response.send(apiResponse.error(1, error.message));
				return;
			}
		}

		response.send(apiResponse.success());
	}

	/**
	 * Player attempts to join a game, which may or may not exist
	 */
	joinGame = async (request: Request, response: Response) => {
		const gameId = Number(request.params.gameId);

		try {
			this.gc.addPlayerToGame(gameId, request.player);
			response.send(apiResponse.success());
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(1, error.message));
			return;
		}
	}

	/**
	 * Player attempts to leave a game, which may or may not exist.
	 * Player also may not already be part of the game.
	 */
	leaveGame = async (request: Request, response: Response) => {
		const gameId = Number(request.params.gameId);

		try {
			this.gc.removePlayerFromGame(gameId, request.player)
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(1, error.message));
			return;
		}

		response.send(apiResponse.success());
	}

	/**
	 * Player attempts to ready up
	 */
	playerReady = async (request: Request, response: Response) => {
		const gameId = Number(request.params.gameId);

		try {
			this.gc.playerReadyUp(gameId, request.player);
			response.send(apiResponse.success());
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(1, error.message));
			return;
		}
	}

	/**
	 * Player attempts to ready up
	 */
	playerUnready = async (request: Request, response: Response) => {
		const gameId = Number(request.params.gameId);

		try {
			this.gc.playerUnready(gameId, request.player);
			response.send(apiResponse.success());
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(1, error.message));
			return;
		}
	}


	/**
	 * Pull a game from history
	 * This route is only used as a fallback for non-gc games
	 */
	getGame = async (request: Request, response: Response) => {
		const gameId = Number(request.params.gameId);

		// Try to pull from the db
		try {
			response.send(apiResponse.success(await this.db.game.get(gameId)));
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(1, error.message));
		}

	}
}
