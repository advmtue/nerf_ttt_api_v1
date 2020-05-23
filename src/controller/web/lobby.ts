import {Request, Response, Router} from 'express';
import {Controller} from './_controller';
import {db} from '../../lib/db';
import {checkAuth} from './auth';
import * as jwtlib from '../../lib/jwt';
import {Player} from '../../../models/player';
import {requestGetPlayer} from '../../lib/web';

export class LobbyController extends Controller {
	applyRoutes(router: Router): void {
		router.get('/lobby', this.getLobbyList);
		router.get('/lobby/:lobbyId', this.getLobby);
		router.get('/lobby/:lobbyId/players', this.getLobbyPlayers);
		router.post('/lobby', [checkAuth, this.createLobby]);
		router.delete('/lobby/:lobbyId', [checkAuth, this.deleteLobby]);
		router.delete('/lobby/:lobbyId/admin', [checkAuth, this.deleteLobby]);
		router.get('lobby/:lobbyId/join', [checkAuth, this.joinLobby]);
		router.get('lobby/:lobbyId/leave', [checkAuth, this.leaveLobby]);
	}

	/* Player attempts to join a lobby */
	joinLobby = async (request: Request, response: Response): Promise<void> => {
		// Get player information
		let player: Player = undefined;
		try {
			player = await requestGetPlayer(request);
		} catch {
			response.send(403);
			return
		}

		/*
		   Get the lobby information so that we can ensure
		   that the lobby hasn't already started
		 */
		let lobby: Lobby = undefined;
		try {
			lobby = await db.getLobby(request.params.lobbyId);
		} catch {
			response.send(403);
			return;
		}

		// If the lobby is not waiting for players, return forbidden
		if (lobby.lobby_status !== 'WAITING') {
			response.send(403);
			return;
		}

		// Join the lobby
		const joinedLobby = await db.lobbyAddPlayer(lobby.id, player.id);

		// If the player succesfully joined
		if (joinedLobby) {
			// Update the lobby listening group
		} else {
			// Notify the player
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

		// Get the user trying to make the lobby
		const user = jwtlib.decode(request.headers.authorization) as Player;

		// Ensure they have permissions
		const hasPermission = await db.groupHasPermission(user.group, 'createLobby');

		if (!hasPermission) {
			response.send({id: -1});
			return;
		}

		// Create the lobby
		const newLobby = await db.createLobby(user.id, lobbyName);

		// Notify any listeners of an update
		this.api.io.to('lobbyListUpdate').emit('addLobby', newLobby);

		// Send the lobbyId
		response.send({id: newLobby.id});
	};

	// Admin or owner deletes the lobby
	deleteLobby = async (request: Request, response: Response): Promise<void> => {
		// Determine which path we are on
		const urlEnd = request.originalUrl.split('/').pop();
		const byAdmin = urlEnd === "admin";
		const lobbyId = Number(request.params.lobbyId);

		// Get the calling player
		const player = await requestGetPlayer(request);
		if (player === null) {
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
			response.send(true);
		} else {
			response.send(false);
		}
	};


}
