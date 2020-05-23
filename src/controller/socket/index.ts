import {db} from '../../lib/db';

export function applySocketRoutes(io: SocketIO.Server) {
	io.on('connect', onConnect);
}

function onConnect(socket: SocketIO.Socket) {
	socket.on('getLobbyList', getLobbyList);
}

async function getLobbyList(this: SocketIO.Socket, data: any) {
	const lobbies = await db.getLobbyList();
	this.emit('getLobbyList', lobbies);
	// Join the lobby update group
	this.join('lobbyListUpdate');
}
