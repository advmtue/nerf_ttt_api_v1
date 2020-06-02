// Modules
import { Request, Response, Router } from 'express';

// Libs
import * as db from '../database';
import { io } from '../../lib/io';
import { checkAuth } from '../../lib/auth';
import { logger } from '../../lib/logger';
import * as apiResponse from '../../lib/apiresponse';

/**
 * HTTP endpoint for a player requesting to leave a lobby
 * The converse of joinLobby()
 *
 * @param request express request object
 * @param response express response object
 */
async function leaveLobby(request: Request, response: Response): Promise<void> {
	const { player } = request;
	if (!player) {
		response.send(apiResponse.httpError(403));
		return;
	}

	const lobbyId = Number(request.params.lobbyId);
	const playerId = player.id;

	// Attempt to remove the player from the lobby
	let lobbyPlayerCount;
	try {
		// Throws an error if the player isn't in the lobby
		lobbyPlayerCount = await db.lobby.removePlayer(lobbyId, playerId);
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.error(1, error.message));
		return;
	}

	// Notify the lobby room that they player has left
	io.to(`lobby ${lobbyId}`).emit('playerLeave', player);

	// Notify the lobby list viewers of a player differential
	io.to('lobbyListUpdate').emit('lobbyPlayerChange', { lobby: lobbyId, change: lobbyPlayerCount });

	// Let the client know their request succeeded, and they have left the lobby
	response.send(apiResponse.success());
}

/**
 * HTTP endpoint for when a player tries to join a lobby
 * The converse of leaveLobby()
 *
 * @param request Express request object
 * @param response Express response object
 */
async function joinLobby(request: Request, response: Response): Promise<void> {
	// Get player information
	const { player } = request;
	if (player === undefined) {
		response.send(apiResponse.httpError(403));
		return;
	}

	const lobbyId = Number(request.params.lobbyId);
	const playerId = player.id;

	// Attempt to join the lobby
	let lobbyPlayerCount: number;
	try {
		lobbyPlayerCount = await db.lobby.addPlayer(lobbyId, playerId);
	} catch (error) {
		// Failed to join. Send error message to the user.
		response.send(apiResponse.error(1, error.message));
		return;
	}

	// Ack player
	response.send(apiResponse.success());

	// Update the lobby room with the new player
	io.to(`lobby ${lobbyId}`).emit('playerJoin', player);

	// Update the lobby list viewers with the player change diff
	io.to('lobbyListUpdate').emit('lobbyPlayerChange', { lobby: lobbyId, change: lobbyPlayerCount });
}

/**
 * HTTP endpoint for pulling lobby player listing
 *
 * @param request Express request object
 * @param response Express response object
 */
async function getLobbyPlayers(request: Request, response: Response): Promise<void> {
	try {
		const players = await db.lobby.getPlayers(request.params.lobbyId);
		response.send(apiResponse.success(players));
	} catch (error) {
		// Internal server error
		logger.error(error);
		response.send(apiResponse.httpError(500));
	}
}

/**
 * HTTP endpoint for pulling the list of lobbies
 *
 * @param request Express request object
 * @param response Express response object
 */
async function getLobbyList(request: Request, response: Response): Promise<void> {
	try {
		const lobbyList = await db.lobby.getList();
		response.send(apiResponse.success(lobbyList));
	} catch (error) {
		// Internal server error
		logger.error(error);
		response.send(apiResponse.httpError(500));
	}
}

/**
 * HTTP endpoint for pulling an individual lobby
 * @param request Express request object
 * @param response Express response object
 */
async function getLobby(request: Request, response: Response): Promise<void> {
	try {
		const lobby = await db.lobby.get(request.params.lobbyId);
		response.send(apiResponse.success(lobby));
	} catch (err) {
		// Internal server error
		logger.error(err);
		response.send(apiResponse.httpError(500));
	}
}

/**
 * HTTP endpoint for player attempting to create a lobby
 *
 * @param request Express request object
 * @param response Express request object
 */
async function createLobby(request: Request, response: Response): Promise<void> {
	// Ensure the body has actually been filled out
	if (!request.body.name) {
		// Malformed request
		response.send(apiResponse.httpError(400));
		return;
	}

	const lobbyName = request.body.name;

	// Pull the userid
	const user = request.player;
	if (!user) {
		response.send(apiResponse.httpError(403));
		return;
	}

	// Pull user permissions
	const hasPermission = await db.group.hasPermission(user.group_name, 'createLobby');

	// If the player doesn't have permission to make the request
	if (!hasPermission) {
		response.send(apiResponse.httpError(403));
		return;
	}

	// Create the lobby
	try {
		const lobby = await db.lobby.create(user.id, lobbyName);

		// Send success response
		response.send(apiResponse.success(lobby));

		// Notify any listeners of an update
		io.to('lobbyListUpdate').emit('addLobby', lobby);
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.httpError(500));
	}
}

/**
 * HTTP endpoint for gamemaster/admin closing a lobby
 *
 * @param request Express request object
 * @param response Express response object
 */
async function deleteLobby(request: Request, response: Response): Promise<void> {
	// Determine which path we are on
	const urlEnd = request.originalUrl.split('/').pop();
	const byAdmin = urlEnd === 'admin';
	const lobbyId = Number(request.params.lobbyId);

	// Get the calling player
	const { player } = request;
	if (!player) {
		response.send(apiResponse.httpError(403));
		return;
	}

	// Default to not being allowed to close this lobby
	let canClose = false;

	// If this is an admin trying to close the lobby
	if (byAdmin) {
		// Ensure the calling player has admin permissions
		canClose = await db.group.hasPermission(player.group_name, 'closeLobby');
	} else {
		// Otherwise check that the player owns the lobby
		try {
			const ownerProfile = await db.lobby.getOwner(lobbyId);

			if (ownerProfile.id === player.id) {
				canClose = true;
			}
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.httpError(500));
		}
	}

	// If the user is allowed to close the lobby
	if (canClose) {
		// Close it
		await db.lobby.close(lobbyId, byAdmin);

		// Let all lobby clients know that it has closed
		io.to(`lobby ${lobbyId}`).emit('lobbyClosed');

		// Let the lobby list viewers know the lobby has been removed
		io.to('lobbyListUpdate').emit('removeLobby', { id: lobbyId });

		// Send success to the caller
		response.send(apiResponse.success());
	} else {
		// Send failure to the caller
		response.send(apiResponse.httpError(403));
	}
}

/**
 * Player ready in lobby
 *
 * @param request Express request
 * @param response Express response
 */
async function playerReady(request: Request, response: Response) {
	const { lobbyId } = request.params;
	const playerId = request.player?.id;

	if (!playerId) {
		response.send(apiResponse.httpError(403));
		return;
	}

	try {
		await db.lobby.setPlayerReady(lobbyId, playerId);

		// Ack
		response.send(apiResponse.success());

		// Notify lobby players
		io.to(`lobby ${lobbyId}`).emit('playerReady', playerId);
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.httpError(500));
	}
}

/**
 * Player unready in lobby
 * @param request Express request
 * @param response Express response
 */
async function playerUnready(request: Request, response: Response) {
	const playerId = request.player?.id;
	const { lobbyId } = request.params;

	// No auth
	if (!playerId) {
		response.send(apiResponse.httpError(403));
		return;
	}

	try {
		await db.lobby.setPlayerUnready(lobbyId, playerId);

		// Ack
		response.send(apiResponse.success());

		// Notify lobby players
		io.to(`lobby ${lobbyId}`).emit('playerUnready', playerId);
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.httpError(500));
	}
}

/**
 * Start a lobby -> Transition to game
 *
 * @param request Express request
 * @param response Express response
 */
async function startLobby(request: Request, response: Response) {
	// Ensure the player has been attached to the request
	if (!request.player) {
		response.send(apiResponse.httpError(403));
		return;
	}

	// Extract player and lobby
	const { player } = request;
	const lobbyId = Number(request.params.lobbyId);

	let gameId;
	try {
		gameId = await db.lobby.start(lobbyId, player.id);
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.error(1, error.message));
		return;
	}

	// Send success response to player
	response.send(apiResponse.success());

	// Notify the lobby group
	io.to(`lobby ${lobbyId}`).emit('lobbyStarted', gameId);

	// Notify the main page listeners
	io.to('lobbyListUpdate').emit('lobbyStarted', lobbyId);
}

/**
 * Apply lobby specific routes to an express router
 *
 * @param router Express Router to modify
 */
export function applyRoutes(router: Router): void {
	// Get lobby list
	router.get('/lobby', getLobbyList);

	// Get single lobby
	router.get('/lobby/:lobbyId', getLobby);

	// Get players in a lobby
	router.get('/lobby/:lobbyId/players', getLobbyPlayers);

	// Create a new lobby
	router.post('/lobby', [checkAuth, createLobby]);

	// Close a lobby
	router.delete('/lobby/:lobbyId', [checkAuth, deleteLobby]);
	// ... as admin
	router.delete('/lobby/:lobbyId/admin', [checkAuth, deleteLobby]);

	// Join a lobby
	router.get('/lobby/:lobbyId/join', [checkAuth, joinLobby]);
	// Leave a lobby
	router.get('/lobby/:lobbyId/leave', [checkAuth, leaveLobby]);

	// Ready up
	router.get('/lobby/:lobbyId/ready', [checkAuth, playerReady]);
	router.get('/lobby/:lobbyId/unready', [checkAuth, playerUnready]);

	// Gamemaster start lobby
	router.put('/lobby/:lobbyId/start', [checkAuth, startLobby]);
}
export default applyRoutes;
