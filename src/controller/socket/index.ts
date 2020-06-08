import * as db from '../database';
import { logger } from '../../lib/logger';
import * as jwtlib from '../../lib/jwt';

/**
 * Send the active lobby list to a socket, and add it to the lobbyListUpdate room
 *
 * @param this The calling socket
 */
async function getLobbyList(this: SocketIO.Socket) {
	logger.info('Socket requested lobby list');
	const lobbies = await db.lobby.getList();
	this.emit('getLobbyList', lobbies);
	// Join the lobby update group
	this.join('lobbyListUpdate');
}

/**
 * Socket requests to join a given lobbyId room.
 *
 * @param this Socket
 * @param lobbyId Lobby to be joined
 */
async function joinLobby(this: SocketIO.Socket, lobbyId: number) {
	logger.info(`Socket#${this.player?.id} viewing Lobby#${lobbyId}`);
	this.join(`lobby ${lobbyId}`);
}

/**
 * Socket performs authentication request using JWT
 *
 * @param this Socket
 * @param token Player JWT
 */
async function auth(this: SocketIO.Socket, token: string) {
	const playerId = jwtlib.decodeId(token);

	// Pull corresponding player and associate with socket
	try {
		this.player = await db.player.get(playerId);
	} catch (error) {
		logger.error(error);
		this.emit('auth', false);
		return;
	}

	// ACK
	this.emit('auth', true);
	// Join user room for any private messages
	this.join(`player ${this.player.id}`);
	logger.info(`Associated Socket#${this.id} with Player#${this.player.id}`);
}

/**
 * Performs route association on a socket
 *
 * @param socket The connecting socket
 */
function onConnect(socket: SocketIO.Socket) {
	socket.on('getLobbyList', getLobbyList);
	socket.on('joinLobby', joinLobby);
	socket.on('auth', auth);
}

/**
 * Associates onConnect with new socket connections, on a given socket server
 *
 * @param socketServer The socket server which applies onConnect for new clients
 */
export function applySocketRoutes(socketServer: SocketIO.Server) {
	socketServer.on('connect', onConnect);
}

// Set a default export
export default applySocketRoutes;
