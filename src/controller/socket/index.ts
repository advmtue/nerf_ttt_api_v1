import { db } from '../../lib/db';
import { logger } from '../../lib/logger';

/**
 * Send the active lobby list to a socket, and add it to the lobbyListUpdate room
 *
 * @param this The calling socket
 */
async function getLobbyList(this: SocketIO.Socket) {
	const lobbies = await db.getLobbyList();
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
	logger.log('info', `Socket joined lobby ${lobbyId}`);
	this.join(`lobby ${lobbyId}`);
}

/**
 * Performs route association on a socket
 *
 * @param socket The connecting socket
 */
function onConnect(socket: SocketIO.Socket) {
	socket.on('getLobbyList', getLobbyList);
	socket.on('joinLobby', joinLobby);
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
