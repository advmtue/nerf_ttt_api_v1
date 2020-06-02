// Connection
import { connection } from './connection';

// Libs
import { hashPassword } from '../../lib/crypto';

// Interfaces
import { Player, PlayerProfile } from '../../models/player';

/**
 * The the full list of players
 */
export async function getList() {
	const q = await connection.query('SELECT * FROM player_public');
	return q.rows as Player[];
}

/**
 * Pull a player profile
 *
 * @param playerId Player's ID
 */
export async function get(playerId: number | string): Promise<PlayerProfile | null> {
	const q = await connection.query(
		'SELECT * FROM player_profile WHERE id = $1;',
		[playerId],
	);

	// If no player was found, return null
	if (q.rows.length === 0) {
		return null;
	}

	// Return the first result. There should be no more than one
	return q.rows[0] as PlayerProfile;
}

/**
 * Change a player's password
 *
 * @param pw New password (Plain Text)
 * @param userId User ID
 * @param curPw Current password (Plain Text)
 */
export async function changePassword(pw: string, userId: number, curPw: string) {
	const pwHash = await hashPassword(pw);
	const curpwHash = await hashPassword(curPw);

	const q = await connection.query(
		'UPDATE "player" SET "password_reset" = false, "password" = $1 WHERE "id" = $2 AND "password" = $3',
		[pwHash, userId, curpwHash],
	);

	if (q.rowCount === 0) {
		throw new Error('No records match login');
	}
}

/**
 * Return playerID of matching login
 *
 * @param username User name
 * @param pw Plaintext password
 */
export async function getIdByLogin(username: string, pw: string): Promise<number> {
	// Hash the user password
	const hashedPw = await hashPassword(pw);

	const q = await connection.query(
		'SELECT "id" FROM player WHERE username = $1 AND password = $2',
		[username, hashedPw],
	);

	if (q.rowCount !== 1) {
		throw new Error('Query did not return 1 row.');
	}

	return q.rows[0].id as number;
}
