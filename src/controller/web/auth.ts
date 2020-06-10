// Modules
import { Application, Request, Response } from 'express';

// Libs
import { logger } from '../../lib/logger';
import * as jwtlib from '../../lib/jwt';
import * as apiResponse from '../../lib/apiresponse';

// Associated controllers
import { GameManager } from '../game';
import { Database } from '../database';

// Base class
import { ExpressController } from './index';

import { PlayerLogin } from '../../models/player';

export class ExpressAuthMiddleware {

	constructor(
		protected all: ExpressController,
		protected app: Application,
		protected gc: GameManager,
		protected db: Database
	) {
		// Put routes here
		app.post('/login', this.playerPostLogin);
		app.put('/login', [this.checkAuth, this.playerChangePassword]);
		app.post('/authenticate', this.playerPostAuthenticate);
	}

	/**
	 * HTTP request for a player to change their password.
	 * Player must be authenticated
	 *
	 * @param request Express request object
	 * @param response Express response object
	 */
	playerChangePassword = async (request: Request, response: Response): Promise<void> => {
		// Add header check so typescript doesn't complain
		if (!request.player) {
			response.send(apiResponse.httpError(403));
			return;
		}

		// Extract new and current password
		const { newPassword, currentPassword } = request.body;

		if (!newPassword || !currentPassword) {
			// Malformed request
			response.send(apiResponse.httpError(400));
			return;
		}

		// Determine the status of updating the password in the database
		try {
			// Change password
			await this.db.player.changePassword(request.player.id, newPassword, currentPassword);

			// Send response
			response.send(apiResponse.success());
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.httpError(401));
		}
	}

	/**
	 * HTTP request for a player to login
	 *
	 * @param request Express request object
	 * @param response Express response object
	 */
	playerPostLogin = async (request: Request, response: Response): Promise<void> => {
		// Extract username and password from the request
		const { username, password } = request.body;

		// Ensure the correct parameters have been sent
		if (!username || !password) {
			response.send(apiResponse.httpError(400)); // Malformed request
			return;
		}

		try {
			// Pull a userId for this login
			const player = await this.db.player.getByLogin(username, password);

			// Create a JWT
			const playerJwt = jwtlib.createToken(player, this.db.jwtSecret);

			const profile = await this.db.player.getProfile(player.id, true);

			// Send it
			const loginPack: PlayerLogin = {
				token: playerJwt,
				player: profile,
			};
			response.send(apiResponse.success(loginPack));
		} catch (error) {
			logger.error(error);
			// Internal error
			response.send(apiResponse.httpError(500));
		}
	}

	/**
	 * HTTP request for JWT login exchange
	 *
	 * @param request Express Request
	 * @param respose Express Respose
	 */
	playerPostAuthenticate = async (request: Request, response: Response) => {
		const { token } = request.body;

		if (!token) {
			response.send(apiResponse.httpError(400));
			return;
		}

		try {
			// Decode the token
			const playerId = jwtlib.decodeId(token, this.db.jwtSecret);

			// Assembe a login pack
			const loginPack: PlayerLogin = {
				token,
				player: await this.db.player.getProfile(playerId, true),
			}

			response.send(apiResponse.success(loginPack));
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.httpError(500));
		}
	}

	/**
	 * Express middleware which restricts only authenticated users to view a path
	 *
	 * @param request Express request
	 * @param response Express response
	 * @param next Express next
	 */
	checkAuth = async (request: Request, response: Response, next: any) => {
		// Ensure auth headers have actually been sent
		if (!request.headers.authorization) {
			response.send(apiResponse.httpError(403));
			return;
		}

		// Decode the passed auth token into a UserInfoJwt
		let playerId;
		try {
			playerId = jwtlib.decodeId(request.headers.authorization, this.db.jwtSecret);
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.httpError(403));
			return;
		}

		// Pull a user and assign it to the request context
		try {
			request.player = await this.db.player.get(playerId);
			next();
		} catch (error) {
			// Failed to pull user
			logger.error(error);
			response.sendStatus(403);
		}
	}

}
