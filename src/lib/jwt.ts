// Modules
import * as jwt from 'jsonwebtoken';

// Config
import { jwtConfig } from '../config';

// Interfaces
import { PlayerJwt } from '../models/auth';

let jwtSecret = '';

/**
 * Allow external modules to update the secret
 *
 * @param secret New secret
 */
export function setSecret(secret: string) {
	jwtSecret = secret;
}

/**
 * Create and sign a token using the jwt options from config
 *
 * @param data A UserInfoJwt interface for a user's info
 */
export function createToken(data: PlayerJwt): string {
	if (jwtSecret === '') {
		throw new Error('Could not find jwt_secret');
	}

	return jwt.sign(
		data,
		jwtSecret,
		jwtConfig.options,
	);
}

/**
 * Decode a jwt string into a UserInfoJwt
 *
 * @param token String containing encoded UserInfoJwt interface
 */
export function decode(token: string): PlayerJwt {
	if (jwtSecret === '') {
		throw new Error('Could not find jwt_secret');
	}

	return jwt.verify(
		token,
		jwtSecret,
	) as PlayerJwt;
}
