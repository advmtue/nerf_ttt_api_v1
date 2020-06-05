// Connection
import { connection } from './connection';

// Libs
import { hashPassword } from '../../lib/crypto';

// Interfaces
import * as Player from '../../models/player';
import { logger } from '../../lib/logger';

/**
 * Pull a player's groups list
 *
 * @param playerId Player ID
 */
export async function getGroups(playerId: number) {
	const q = await connection.query(
		'SELECT name, colour, emoji, description FROM view_player_groups WHERE player_id = $1',
		[playerId],
	);

	return q.rows as Player.Group[];
}

/**
 * Pull a player's stats object
 *
 * @todo Actually implement this
 * @param playerId Player ID
 */
export async function getStats(playerId: number): Promise<Player.PlayerStats> {
	logger.warn(`Pulling false stats for Player#${playerId}`);

	const stats: Player.PlayerStats = {
		kills: 0,
		deaths: 0,
		wins: 0,
		losses: 0,
		played: 0,
	};

	return stats;
}


/**
 * Get a player object from a given ID
 *
 * @param playerId Player ID
 */
export async function get(playerId: number): Promise<Player.Player> {
	const q = await connection.query(
		'SELECT name, emoji, colour FROM view_player_basic WHERE id = $1',
		[playerId],
	);

	// No player matches
	if (q.rowCount === 0) {
		throw new Error('No player found');
	}

	const player: Player.Player = {
		id: playerId,
		name: q.rows[0].name,
		emoji: q.rows[0].emoji,
		colour: q.rows[0].colour,
	};

	return player;
}

/**
 * Pull the list of players from the DB
 * @todo Maybe add a limit or search string
 */
export async function getList() {
	const q = await connection.query('SELECT * FROM view_player_basic');

	return q.rows as Player.Player[];
}

/**
 * Pull a player's permissions list
 *
 * @param playerId Player ID
 */
export async function getPermissions(playerId: number): Promise<Player.Permission[]> {
	const q = await connection.query(
		'SELECT name, description FROM view_player_permissions WHERE player_id = $1',
		[playerId],
	);

	return q.rows as Player.Permission[];
}
/**
 * Determine if a given player has a given permission.
 *
 * @param playerId Player ID
 * @param permName Permission name
 */
export async function hasPermission(playerId: number, permName: string) {
	const permissions = await getPermissions(playerId);

	const hasAll = permissions.some((p) => p.name === 'all');
	const hasPer = permissions.some((p) => p.name === permName);

	return hasAll || hasPer;
}

/**
 * Change a player's password
 *
 * @param playerId Player ID
 * @param pw New password
 * @param curPw Current password
 */
export async function changePassword(playerId: number, pw: string, curPw: string) {
	const pwHash = await hashPassword(pw);
	const curpwHash = await hashPassword(curPw);

	const q = await connection.query(
		'UPDATE "player" SET "password_reset" = false, "password" = $1 WHERE "id" = $2 AND "password" = $3',
		[pwHash, playerId, curpwHash],
	);

	if (q.rowCount === 0) {
		throw new Error('No records match login');
	}
}

/**
 * Return Player for matching login
 *
 * @param username User name
 * @param pw Plaintext password
 */
export async function getByLogin(username: string, pw: string): Promise<Player.Player> {
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

/**
 * Pull a player's full profile (expensive)
 *
 * @param playerId Player ID
 */
export async function getProfile(
	playerId: number,
	showReset?: boolean,
): Promise<Player.PlayerProfile> {
	// Pull base profile information
	const q = await connection.query(
		'SELECT * FROM view_player_profile WHERE id = $1',
		[playerId],
	);

	if (q.rowCount === 0) {
		throw new Error('No player found');
	}

	const player = q.rows[0];

	const profile: Player.PlayerProfile = {
		id: player.id,
		name: player.name,
		emoji: player.emoji,
		colour: player.colour,
		banned: player.banned,
		join_date: player.join_date,
		primary_group: player.primary_group,
		groups: await getGroups(playerId),
		permissions: await getPermissions(playerId),
		stats: await getStats(playerId),
	};

	if (showReset) {
		profile.password_reset = player.password_reset;
	}

	return profile;
}
