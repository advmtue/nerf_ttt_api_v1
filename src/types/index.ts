// Interfaces
import { Player } from '../models/player';
import { UserInfoJwt } from '../models/jwt';

/**
 * Extend the express 'Request' interface
 *
 * player?: A requesting player assigned during checkAuth()
 * userJwt?: The decoded auth header jwt assigned during checkAuth()
 */
declare module 'express-serve-static-core' {
	interface Request {
		player?: Player;
		userJwt?: UserInfoJwt;
	}
}
