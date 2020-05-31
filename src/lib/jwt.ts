// Modules
import * as jwt from 'jsonwebtoken';

// Config
import { jwtConfig } from '../config';

// Interfaces
import { UserInfoJwt } from '../models/jwt';

/**
 * Create and sign a token using the jwt options from config
 *
 * @param data A UserInfoJwt interface for a user's info
 */
export function createToken(data: UserInfoJwt): string {
	return jwt.sign(
		data,
		jwtConfig.secret,
		jwtConfig.options,
	);
}

/**
 * Decode a jwt string into a UserInfoJwt
 *
 * @param token String containing encoded UserInfoJwt interface
 */
export function decode(token: string): UserInfoJwt {
	return jwt.verify(
		token,
		jwtConfig.secret,
	) as UserInfoJwt;
}
