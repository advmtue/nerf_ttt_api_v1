// Modules
import * as jwt from 'jsonwebtoken';

// Config
import { jwtConfig } from '../config';

// Interfaces
import { Player } from '../models/player';

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
export function createToken(player: Player): string {
	if (jwtSecret === '') {
		throw new Error('Could not find jwt_secret');
	}

	return jwt.sign(
		{ id: player.id },
		jwtSecret,
		jwtConfig.options,
	);
}

/**
 * Decode a JWT into a Player ID
 *
 * @param token JWT String containing { id: number }
 */
export function decodeId(token: string): number {
	if (jwtSecret === '') {
		throw new Error('Could not find jwt_secret');
	}

	const jwtData = jwt.verify(token, jwtSecret) as { id: number };
	return jwtData.id;
}
