import {Request, Response, Router} from 'express';
import {Controller} from './_controller';
import {db} from '../../lib/db';
import * as jwtlib from '../../lib/jwt';
import {checkAuth} from './auth';
import {Player, PlayerProfile} from '../../models/player';
import {Lobby, CreateLobbyResponse} from '../../models/lobby';
import {requestGetPlayer} from '../../lib/web';

export class LobbyController extends Controller {
	applyRoutes(router: Router): void {
		router.get('/lobby', this.getLobbyList);
		router.get('/lobby/:lobbyId', this.getLobby);
		router.get('/lobby/:lobbyId/players', this.getLobbyPlayers);
		router.post('/lobby', [checkAuth, this.createLobby]);
		router.delete('/lobby/:lobbyId', [checkAuth, this.deleteLobby]);
		router.delete('/lobby/:lobbyId/admin', [checkAuth, this.deleteLobby]);
		router.get('/lobby/:lobbyId/join', [checkAuth, this.joinLobby]);
		router.get('/lobby/:lobbyId/leave', [checkAuth, this.leaveLobby]);
	}

	leaveLobby = async (request: Request, response: Response): Promise<void> => {
		let player = request.player;
		if (!player) {
			response.send(403);
			return;
		}

		// Check lobby Status
		let lobby: Lobby;
		try {
			lobby = await db.getLobby(request.params.lobbyId);
		} catch {
			response.send(404);
			return;
		}

		// Ensure we are still waiting for players
		if (lobby === null || lobby.lobby_status !== 'WAITING') {
			response.send(403);
			return;
		}

		// Remove the player from the lobby
		const leftLobby = await db.lobbyRemovePlayer(lobby.id, player.id);

		if (leftLobby) {
			this.api.io.to(`lobby ${lobby.id}`).emit('playerLeave', player);
			this.api.io.to('lobbyListUpdate').emit('lobbyPlayerChange', {lobby: lobby.id, change: -1});
			response.send(true);
		} else {
			response.send(false);
		}
	}

	/* Player attempts to join a lobby */
	joinLobby = async (request: Request, response: Response): Promise<void> => {
		// Get player information
		let player = request.player;
		if (player === undefined) {
			response.send(403);
			return;
		}

		/*
		   Get the lobby information so that we can ensure
		   that the lobby hasn't already started
		 */
		let lobby: Lobby;
		try {
			lobby = await db.getLobby(request.params.lobbyId);
		} catch {
			response.send(403);
			return;
		}

		// If the lobby is not waiting for players, return forbidden
		if (lobby === null || lobby.lobby_status !== 'WAITING') {
			response.send(403);
			return;
		}

		// Join the lobby
		const joinedLobby = await db.lobbyAddPlayer(lobby.id, player.id);

		// If the player succesfully joined
		if (joinedLobby) {
			// Ack player
			response.send(true);

			// Update the socket room
			this.api.io.to(`lobby ${lobby.id}`).emit('playerJoin', player);
			this.api.io.to('lobbyListUpdate').emit('lobbyPlayerChange', {lobby: lobby.id, change: 1});
		} else {
			// Notify the player
			response.send(false);
		}
	}

	/* Get an array of players who are participating in a lobby */
	getLobbyPlayers = async (request: Request, response: Response): Promise<void> => {
		response.send(await db.getLobbyPlayers(request.params.lobbyId));
	}

	/* Get the lobby listing */
	getLobbyList = async (request: Request, response: Response): Promise<void> => {
		response.send(await db.getLobbyList());
	};


	/* Get lobby by ID */
	getLobby = async (request: Request, response: Response): Promise<void> => {
		response.send(await db.getLobby(request.params.lobbyId));
	};

	createLobby = async (request: Request, response: Response): Promise<void> => {
		// Ensure the body has actually been filled out
		if (!request.body || !request.body.name) {
			response.send({id: -1});
		}

		const lobbyName = request.body.name;

		// Setup the payload for sending back to the user
		const payload: CreateLobbyResponse = {
			success: false,
			lobby: null
		};

		// Get the user
		const user = request.player;
		if (!user) {
			response.send(403);
			return;
		}

		// Ensure they have permissions
		const hasPermission = await db.groupHasPermission(user.group_name, 'createLobby');

		if (!hasPermission) {
			response.send(payload);
			return;
		}

		// Create the lobby
		try {
			payload.lobby = await db.createLobby(user.id, lobbyName);
			payload.success = true;

			// Notify any listeners of an update
			this.api.io.to('lobbyListUpdate').emit('addLobby', payload.lobby);
		} catch (err) {
			console.log('Failed to create new lobby.');
			console.log(err);
		}

		// Send the lobbyId
		response.send(payload);

	};

	// Admin or owner deletes the lobby
	deleteLobby = async (request: Request, response: Response): Promise<void> => {
		// Determine which path we are on
		const urlEnd = request.originalUrl.split('/').pop();
		const byAdmin = urlEnd === "admin";
		const lobbyId = Number(request.params.lobbyId);

		// Get the calling player
		const player = request.player;
		if (player === undefined) {
			response.send(false);
			return;
		}

		// Default to disallow
		let canClose = false;
		if (byAdmin) {
			// Check the user's group has permission
			canClose = await db.groupHasPermission(player.group_name, 'closeLobby');
		} else {
			// Check the user owns the lobby
			try {
				const ownerProfile = await db.lobbyGetOwnerProfile(lobbyId);

				if (ownerProfile.id === player.id) {
					canClose = true;
				}
			} catch (err) {
				console.log(err);
			}
		}

		// If the user is allowed to close the lobby, close it
		if (canClose) {
			await db.closeLobby(lobbyId, byAdmin);
			this.api.io.to('lobbyListUpdate').emit('removeLobby', {id: lobbyId});
			this.api.io.to(`lobby ${lobbyId}`).emit('lobbyClosed');
			response.send(true);
		} else {
			response.send(false);
		}
	};
}
