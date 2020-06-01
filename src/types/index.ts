// Interfaces
import { Player } from '../models/player';
import { PlayerJwt } from '../models/auth';

/**
 * Extend the express 'Request' interface
 *
 * player?: A requesting player assigned during checkAuth()
 * userJwt?: The decoded auth header jwt assigned during checkAuth()
 */
declare module 'express-serve-static-core' {
	interface Request {
		player?: Player;
		playerJwt?: PlayerJwt;
	}
}

/**
 * Extend socket.io socket interface
 *
 * player?: A player assigned during auth
 * jwt?: Jwt used for auth
 */
declare global {
	namespace SocketIO {
		interface Socket {
			player?: Player;
			jwt?: PlayerJwt;
		}
	}
}
