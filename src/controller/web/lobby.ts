// Modules
import { Request, Response, Router } from 'express';

// Libs
import * as db from '../../lib/db';
import { io } from '../../lib/io';
import { checkAuth } from '../../lib/auth';
import { logger } from '../../lib/logger';
import * as apiResponse from '../../lib/apiresponse';

// Interfaces
import { Lobby } from '../../models/lobby';

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

	// Pull lobby info
	let lobby: Lobby;
	try {
		lobby = await db.getLobby(request.params.lobbyId);
	} catch {
		response.send(apiResponse.httpError(404));
		return;
	}

	// Ensure the lobby exists and it is still in the WAITING phase
	if (lobby === null || lobby.lobby_status !== 'WAITING') {
		response.send(apiResponse.error(2, 'Lobby is either NULL or not WAITING'));
		return;
	}

	// Remove the player from the lobby
	try {
		await db.lobbyRemovePlayer(lobby.id, player.id);
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.error(1, 'Failed to remove player from lobby.'));
		return;
	}

	// Notify the lobby room that they player has left
	io.to(`lobby ${lobby.id}`).emit('playerLeave', player);

	// Notify the lobby list viewers of a player differential
	io.to('lobbyListUpdate').emit('lobbyPlayerChange', { lobby: lobby.id, change: -1 });

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

	// Pull lobby information
	let lobby: Lobby;
	try {
		lobby = await db.getLobby(request.params.lobbyId);
	} catch {
		response.send(apiResponse.httpError(403));
		return;
	}

	// Ensure the lobby exists and that it is in the WAITING phase
	if (lobby === null || lobby.lobby_status !== 'WAITING') {
		response.send(apiResponse.error(2, 'Lobby is either NULL or not WAITING'));
		return;
	}

	// Attempt to join the lobby
	try {
		await db.lobbyAddPlayer(lobby.id, player.id);
	} catch (error) {
		// Failed to join (internal server error?)
		// Send false status to player
		response.send(apiResponse.error(1, 'Failed to add player to lobby'));
		return;
	}

	// Ack player
	response.send(apiResponse.success());

	// Update the lobby room with the new player
	io.to(`lobby ${lobby.id}`).emit('playerJoin', player);

	// Update the lobby list viewers with the player change diff
	io.to('lobbyListUpdate').emit('lobbyPlayerChange', { lobby: lobby.id, change: 1 });
}

/**
 * HTTP endpoint for pulling lobby player listing
 *
 * @param request Express request object
 * @param response Express response object
 */
async function getLobbyPlayers(request: Request, response: Response): Promise<void> {
	try {
		const players = await db.getLobbyPlayers(request.params.lobbyId);
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
		const lobbyList = await db.getLobbyList();
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
		const lobby = await db.getLobby(request.params.lobbyId);
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
	const hasPermission = await db.groupHasPermission(user.group_name, 'createLobby');

	// If the player doesn't have permission to make the request
	if (!hasPermission) {
		response.send(apiResponse.httpError(403));
		return;
	}

	// Create the lobby
	try {
		const lobby = await db.createLobby(user.id, lobbyName);

		// Send success response
		response.send(apiResponse.success(lobby));

		// Notify any listeners of an update
		io.to('lobbyListUpdate').emit('addLobby', lobby);
	} catch (error) {
		logger.log(error);
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
		canClose = await db.groupHasPermission(player.group_name, 'closeLobby');
	} else {
		// Otherwise check that the player owns the lobby
		try {
			const ownerProfile = await db.lobbyGetOwnerProfile(lobbyId);

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
		await db.closeLobby(lobbyId, byAdmin);

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
		await db.lobbyPlayerReady(lobbyId, playerId);

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
		await db.lobbyPlayerUnready(lobbyId, playerId);

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
}
export default applyRoutes;
