// Connection
import { connection } from './connection';

// Libs
import { hashPassword } from '../../lib/crypto';

// Interfaces
import {
	Player,
	PlayerProfile,
	Group,
	Permission,
} from '../../models/player';

// import { logger } from '../../lib/logger';


/**
 * Get a player object from a given ID
 *
 * @param playerId Player ID
 */
export async function get(playerId: number): Promise<Player> {
	// Get player base information
	const q = await connection.query(
		'SELECT id, first_name, last_name, banned, join_date FROM player WHERE id = $1',
		[playerId],
	);

	// No player matches
	if (q.rowCount === 0) {
		throw new Error('No player found');
	}

	// Get groups
	const groups = (await connection.query(
		'SELECT name, colour, emoji, level, description FROM view_player_groups WHERE player_id = $1',
		[playerId],
	)).rows as Group[];

	// Get permissions list
	const permissions = (await connection.query(
		'SELECT name, description FROM view_player_permissions WHERE player_id = $1',
		[playerId],
	)).rows as Permission[];

	const player: Player = {
		id: q.rows[0].id,
		name: `${q.rows[0].first_name} ${q.rows[0].last_name}`,
		banned: q.rows[0].banned,
		join_date: q.rows[0].join_date,
		groups,
		permissions,
	};

	return player;
}

/**
 * The the full list of players
 * @todo Refactor this. It's horrific
 */
export async function getList() {
	const q = await connection.query('SELECT id FROM player');

	const playerPromises: Promise<Player>[] = [];
	q.rows.forEach((p) => playerPromises.push(get(p.id)));

	return Promise.all(playerPromises);
}

/**
 * Pull a player profile
 *
 * @param playerId Player's ID
 */
export async function getProfile(player: Player): Promise<PlayerProfile| null> {
	// Extend with stats
	// TODO: Implement stats
	const playerProfile = player as PlayerProfile;
	playerProfile.stats = {
		kills: 0,
		deaths: 0,
		wins: 0,
		losses: 0,
		played: 0,
	};

	return playerProfile;
}

/**
 * Determine if a player has a given permission
 *
 * @param player Player
 * @param permName Permission name
 */
export async function hasPermission(player: Player, permName: string) {
	const hasAll = player.permissions.some((p) => p.name === 'all');
	const hasPer = player.permissions.some((p) => p.name === permName);

	return hasAll || hasPer;
}

/**
 * Change a player's password
 *
 * @param pw New password (Plain Text)
 * @param playerId Player ID
 * @param curPw Current password (Plain Text)
 */
export async function changePassword(player: Player, pw: string, curPw: string) {
	const pwHash = await hashPassword(pw);
	const curpwHash = await hashPassword(curPw);

	const q = await connection.query(
		'UPDATE "player" SET "password_reset" = false, "password" = $1 WHERE "id" = $2 AND "password" = $3',
		[pwHash, player.id, curpwHash],
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
export async function getByLogin(username: string, pw: string): Promise<Player> {
	// Hash the user password
	const hashedPw = await hashPassword(pw);

	const q = await connection.query(
		'SELECT id FROM player WHERE username = $1 AND password = $2',
		[username, hashedPw],
	);

	if (q.rowCount !== 1) {
		throw new Error('Query did not return 1 row.');
	}

	// Return as Promise<Player>
	return get(q.rows[0].id);
}
