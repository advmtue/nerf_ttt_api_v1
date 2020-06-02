// Database connection
import { connection } from './connection';
import * as player from './player';
import * as group from './group';

// Libs
import * as jwtlib from '../../lib/jwt';

// Interfaces
import { PlayerJwt, InitialLogin } from '../../models/auth';

/**
 * Create a new jwt for a given player
 *
 * @param playerId Player ID
 */
export async function createAuthToken(playerId: number) {
	const q = await connection.query(
		'SELECT "id", "password_reset", "group" from "player" WHERE id = $1',
		[playerId],
	);

	if (q.rowCount === 0) {
		throw new Error('Couldn\'t find player specified');
	}

	const loginInfo = q.rows[0] as PlayerJwt;
	const token = jwtlib.createToken(loginInfo);

	return token;
}

/**
 * Pull any player logins that match the given credentials
 *
 * @param username username to match
 * @param pw password hash to match
 */
export async function getPlayerLogin(username: string, pw: string): Promise<PlayerJwt | null> {
	const query = await connection.query(
		'SELECT "id", "password_reset", "group" FROM "player" WHERE "username"=$1 and "password"=$2;',
		[username, pw],
	);

	// If there's more than one player matching, return an error
	// This shouldn't be possible if the DB has proper unique constraints
	if (query.rowCount > 1) {
		throw new Error('getPlayerLogin returned multiple rows');
	} else if (query.rowCount === 0) {
		return null;
	}

	// Once login found, return as PlayerLogin
	return query.rows[0] as PlayerJwt;
}

/**
 * Create an InitialLogin for a given playerId
 *
 * @param playerId Player ID
 */
export async function createInitialLogin(playerId: number) {
	const token = await createAuthToken(playerId);
	const profile = await player.get(playerId);

	if (profile === null) {
		throw new Error('Couldn\'t pull player profile');
	}

	const permissions = await group.getPermissions(profile.group_name);

	return {
		jwt: token,
		profile,
		permissions,
	} as InitialLogin;
}
