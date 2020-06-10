// Modules
import * as jwt from 'jsonwebtoken';

// Config
import { jwtConfig } from '../config';

// Interfaces
import { Player } from '../models/player';

/**
 * Create and sign a token using the jwt options from config
 *
 * @param data A UserInfoJwt interface for a user's info
 */
export function createToken(player: Player, secret: string): string {
	return jwt.sign(
		{ id: player.id },
		secret,
		jwtConfig.options,
	);
}

/**
 * Decode a JWT into a Player ID
 *
 * @param token JWT String containing { id: number }
 * @param secret JWT Secret
 */
export function decodeId(token: string, secret: string): number {
	const jwtData = jwt.verify(token, secret) as { id: number };
	return jwtData.id;
}
