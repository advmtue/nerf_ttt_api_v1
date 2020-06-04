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
		/**
		 * Player can be undefined in some scenarios. Such as when
		 * hitting routes that don't require authentication (rare).
		 *
		 * I would rather deal with unlikely chance of a bug in how routing
		 * is configured, rather than perform existence checks at all routes.
		 */
		player: Player;
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
