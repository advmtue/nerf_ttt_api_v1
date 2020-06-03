// Interfaces
import { Player } from '../models/player';

/**
 * Extend the express 'Request' interface
 *
 * player?: A requesting player assigned during checkAuth()
 * userJwt?: The decoded auth header jwt assigned during checkAuth()
 */
declare module 'express-serve-static-core' {
	interface Request {
		player?: Player;
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
		}
	}
}
