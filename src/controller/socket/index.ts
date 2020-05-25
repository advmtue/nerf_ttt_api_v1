import {db} from '../../lib/db';

export function applySocketRoutes(io: SocketIO.Server) {
	io.on('connect', onConnect);
}

function onConnect(socket: SocketIO.Socket) {
	socket.on('getLobbyList', getLobbyList);
	socket.on('joinLobby', joinLobby);
}

async function getLobbyList(this: SocketIO.Socket, data: any) {
	const lobbies = await db.getLobbyList();
	this.emit('getLobbyList', lobbies);
	// Join the lobby update group
	this.join('lobbyListUpdate');
}

async function joinLobby(this: SocketIO.Socket, lobbyId: number) {
	console.log(`Socket joined lobby ${lobbyId}`);
	this.join(`lobby ${lobbyId}`);
}
