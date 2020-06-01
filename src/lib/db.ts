// Modules
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import { Client } from 'pg';

// Connection config
import { postgresConfig } from '../config';

// Interfaces
import { Player, PlayerProfile } from '../models/player';
import { Lobby } from '../models/lobby';
import { PlayerJwt, InitialLogin } from '../models/auth';

// Libs
import * as jwtlib from './jwt';
import * as cryptolib from './crypto';
import { hashPassword } from './crypto';
import { logger } from './logger';

const randomBytesAsync = promisify(randomBytes);

// Module global connection
const connection = new Client(postgresConfig);
let hashSalt: string | undefined;
let jwtSecret: string | undefined;

/**
 * Generate new secrets and persist them in the database
 */
async function generateSecrets() {
	// 64-length salt
	hashSalt = (await randomBytesAsync(32)).toString('hex');
	cryptolib.setSalt(hashSalt);

	// 64-length jwt_secret
	jwtSecret = (await randomBytesAsync(32)).toString('hex');
	jwtlib.setSecret(jwtSecret);

	await connection.query(
		'INSERT INTO "config" (jwt_secret, hash_salt) VALUES ($1, $2)',
		[jwtSecret, hashSalt],
	);

	logger.info('Inserted fresh jwt_secret and hash_salt into db');
}

/**
 * Reset all passwords to default and enable password_reset
 */
async function invalidatePasswords() {
	const defaultHash = await hashPassword('default');

	await connection.query(
		'UPDATE player SET password = $1, password_reset = true',
		[defaultHash],
	);

	logger.warn('Invalidated all user passwords');
}

/**
 * Pull secrets from the database
 */
async function pullSecrets() {
	const q = await connection.query('SELECT hash_salt, jwt_secret FROM config');

	if (q.rowCount === 0) {
		// They don't exist, generate them
		await generateSecrets();
		await invalidatePasswords();
	} else {
		hashSalt = q.rows[0].hash_salt;
		jwtSecret = q.rows[0].jwt_secret;
	}
}

/**
 * Connect the database, and set the search path
 */
export async function connect() {
	await connection.connect();
	await connection.query('SET search_path TO main');

	// Pull hash_salt and jwt_secret
	await pullSecrets();

	if (jwtSecret && hashSalt) {
		jwtlib.setSecret(jwtSecret);
		cryptolib.setSalt(hashSalt);
	}
}


/**
 * Change a player's password
 *
 * @param pw New password (Plain Text)
 * @param userId User ID
 * @param curPw Current password (Plain Text)
 */
export async function setPlayerPassword(pw: string, userId: number, curPw: string) {
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
 * Get the list of players who are participating in the lobby
 *
 * @param lobbyId The id of the lobby
 */
export async function getLobbyPlayers(lobbyId: number | string): Promise<Player[]> {
	const query = await connection.query(
		'SELECT * FROM lobby_player_public WHERE lobby_id = $1',
		[lobbyId],
	);

	return query.rows as Player[];
}

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
 * Return playerID of matching login
 *
 * @param username User name
 * @param pw Plaintext password
 */
export async function getPlayerIdByLogin(username: string, pw: string): Promise<number> {
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
 * Get the permission array for a given group
 *
 * @param groupId The group to pull permissions for
 */
export async function getGroupPermissions(groupId: string) {
	const permissions = await connection.query(
		'SELECT "permission_name" FROM "group_permission" WHERE "group_name" = $1;',
		[groupId],
	);

	// Extract permission names into a list
	const permissionList: string[] = [];
	permissions.rows.forEach((item: {permission_name: string}) => {
		permissionList.push(item.permission_name);
	});

	return permissionList;
}

/**
 * Get the current list of lobbies that are in the WAITING phase
 */
export async function getLobbyList() {
	const q = await connection.query('SELECT * FROM lobby_public WHERE lobby_status = \'WAITING\'');
	return q.rows as Lobby[];
}

/**
 * Pull a single lobby by its ID
 *
 * @param lobbyId Lobby ID
 */
export async function getLobby(lobbyId: number | string) {
	const q = await connection.query(
		'SELECT * FROM lobby_public WHERE id = $1',
		[lobbyId],
	);

	if (q.rows.length === 0) {
		throw new Error('Lobby query returned 0 rows');
	}

	return q.rows[0] as Lobby;
}

/**
 * The the full list of players
 */
export async function getPlayerList() {
	const q = await connection.query('SELECT * FROM player_public');
	return q.rows as Player[];
}

/**
 * Pull a player profile
 *
 * @param playerId Player's ID
 */
export async function getPlayerProfile(playerId: number | string): Promise<PlayerProfile | null> {
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
 * Create an InitialLogin for a given playerId
 *
 * @param playerId Player ID
 */
export async function createInitialLogin(playerId: number) {
	const token = await createAuthToken(playerId);
	const profile = await getPlayerProfile(playerId);

	if (profile === null) {
		throw new Error('Couldn\'t pull player profile');
	}

	const permissions = await getGroupPermissions(profile.group_name);

	return {
		jwt: token,
		profile,
		permissions,
	} as InitialLogin;
}
/**
 * Create a new lobby, specifiying the owner
 *
 * @param ownerId Owner of the lobby
 * @param name Lobby name
 */
export async function createLobby(ownerId: number, name: string) {
	const q = await connection.query(
		'INSERT INTO lobby (owner_id, name) VALUES ($1, $2)',
		[ownerId, name],
	);

	// Insertion failed, throw an error
	if (q.rowCount !== 1) {
		throw new Error('Failed to create new lobby');
	}

	// Pull the lobby for returning
	const q2 = await connection.query(
		'SELECT * FROM lobby_public WHERE owner_id = $1 and name = $2 LIMIT 1',
		[ownerId, name],
	);

	// If the new lobby couldn't be retreived, fail with error
	if (q2.rowCount !== 1) {
		throw new Error('Failed to find new lobby');
	}

	return q2.rows[0] as Lobby;
}

/**
 * Attempt to forcibly close a lobby.
 * Can be performed by lobby owner or an admin
 *
 * @param lobbyId Lobby ID
 * @param byAdmin Admin Status
 */
export async function closeLobby(lobbyId: number, byAdmin: boolean) {
	const status = byAdmin ? 'CLOSED_BY_ADMIN' : 'CLOSED_BY_OWNER';

	await connection.query(
		'UPDATE lobby SET lobby_status = $1 WHERE "id" = $2',
		[status, lobbyId],
	);

	return 1;
}

/**
 * Check if a group has sufficient permissions to perform a task
 *
 * @param groupId Group Id
 * @param permissionName Name of permission
 */
export async function groupHasPermission(groupId: string, permissionName: string) {
	const q = await connection.query(
		'SELECT permission_name FROM group_permission WHERE group_name = $1',
		[groupId],
	);

	// Group has permission || group has all permissions
	let hasPermission = false;
	q.rows.forEach((row) => {
		if (row.permission_name === 'all' || row.permission_name === permissionName) {
			hasPermission = true;
		}
	});

	return hasPermission;
}

/**
 * Pull the profile of a lobby owner
 *
 * @param lobbyId Lobby ID
 */
export async function lobbyGetOwnerProfile(lobbyId: number) {
	const q = await connection.query(
		'SELECT * FROM main.player_public WHERE id = (SELECT owner_id from main.lobby WHERE id = $1)',
		[lobbyId],
	);

	if (q.rowCount !== 1) {
		throw new Error('Player not found');
	}

	return q.rows[0] as Player;
}

/**
 * Add a player to a lobby
 *
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 */
export async function lobbyAddPlayer(lobbyId: number | string, playerId: number) {
	// TODO: Check lobby status

	await connection.query(
		'INSERT INTO lobby_player (lobby_id, player_id) VALUES ($1, $2)',
		[lobbyId, playerId],
	);
}

/**
 * Remove a player from a lobby
 *
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 */
export async function lobbyRemovePlayer(lobbyId: number | string, playerId: number) {
	await connection.query(
		'DELETE FROM lobby_player WHERE lobby_id = $1 AND player_id = $2',
		[lobbyId, playerId],
	);
}

/**
 * Player ready
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 */
export async function lobbyPlayerReady(lobbyId: number| string, playerId: number) {
	await connection.query(
		'UPDATE lobby_player SET ready = TRUE where lobby_id = $1 AND player_id = $2',
		[lobbyId, playerId],
	);
}

/**
 * Player unready
 *
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 */
export async function lobbyPlayerUnready(lobbyId: number | string, playerId: number) {
	await connection.query(
		'UPDATE lobby_player SET ready = FALSE WHERE lobby_id = $1 AND player_id = $2',
		[lobbyId, playerId],
	);
}
