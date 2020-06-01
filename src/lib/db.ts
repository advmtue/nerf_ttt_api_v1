import { Client } from 'pg';
import { postgresConfig } from '../config';
import { Player, PlayerProfile } from '../models/player';
import { Lobby } from '../models/lobby';
import { PlayerLogin } from '../models/login';

/**
 * Database abstractions, also housing a connection
 */
class DBLib {
	// Postgres client connection
	client: Client;

	constructor() {
		this.client = new Client(postgresConfig);
	}

	/**
	 * Connect the database, and set the search path
	 */
	async connect() {
		await this.client.connect();
		await this.client.query('SET search_path TO main');
	}

	/**
	 * Change a player's password if curpwHash matches
	 *
	 * @param pwHash The hash of the new password
	 * @param userId User id
	 * @param curpwHash The hash of the new password
	 */
	async setPlayerPassword(pwHash: string, userId: number, curpwHash: string) {
		const updateQuery = await this.client.query(
			'UPDATE "player" SET "password_reset" = false, "password" = $1 WHERE "id" = $2 AND "password" = $3',
			[pwHash, userId, curpwHash],
		);

		return updateQuery.rowCount === 1;
	}

	/**
	 * Get the list of players who are participating in the lobby
	 *
	 * @param lobbyId The id of the lobby
	 */
	async getLobbyPlayers(lobbyId: number | string): Promise<Player[]> {
		const query = await this.client.query(
			'SELECT * FROM lobby_player_public WHERE lobby_id = $1',
			[lobbyId],
		);

		return query.rows as Player[];
	}

	/**
	 * Pull any player logins that match the given credentials
	 *
	 * @param username username to match
	 * @param pw password hash to match
	 */
	async getPlayerLogin(username: string, pw: string): Promise<PlayerLogin | null> {
		const query = await this.client.query(
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
		return query.rows[0] as PlayerLogin;
	}

	/**
	 * Get the permission array for a given group
	 *
	 * @param groupId The group to pull permissions for
	 */
	async getGroupPermissions(groupId: string) {
		const permissions = await this.client.query(
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
	async getLobbyList() {
		const q = await this.client.query('SELECT * FROM lobby_public WHERE lobby_status = \'WAITING\'');
		return q.rows as Lobby[];
	}

	/**
	 * Pull a single lobby by its ID
	 *
	 * @param lobbyId Lobby ID
	 */
	async getLobby(lobbyId: number | string) {
		const q = await this.client.query(
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
	async getPlayerList() {
		const q = await this.client.query('SELECT * FROM player_public');
		return q.rows as Player[];
	}

	/**
	 * Pull a player profile
	 *
	 * @param playerId Player's ID
	 */
	async getPlayerProfile(playerId: number | string): Promise<PlayerProfile | null> {
		const q = await this.client.query(
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
	 * Create a new lobby, specifiying the owner
	 *
	 * @param ownerId Owner of the lobby
	 * @param name Lobby name
	 */
	async createLobby(ownerId: number, name: string) {
		const q = await this.client.query(
			'INSERT INTO lobby (owner_id, name) VALUES ($1, $2)',
			[ownerId, name],
		);

		// Insertion failed, throw an error
		if (q.rowCount !== 1) {
			throw new Error('Failed to create new lobby');
		}

		// Pull the lobby for returning
		const q2 = await this.client.query(
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
	async closeLobby(lobbyId: number, byAdmin: boolean) {
		const status = byAdmin ? 'CLOSED_BY_ADMIN' : 'CLOSED_BY_OWNER';

		await this.client.query(
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
	async groupHasPermission(groupId: string, permissionName: string) {
		const q = await this.client.query(
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
	async lobbyGetOwnerProfile(lobbyId: number) {
		const q = await this.client.query(
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
	async lobbyAddPlayer(lobbyId: number | string, playerId: number) {
		// TODO: Check lobby status

		await this.client.query(
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
	async lobbyRemovePlayer(lobbyId: number | string, playerId: number) {
		await this.client.query(
			'DELETE FROM lobby_player WHERE lobby_id = $1 AND player_id = $2',
			[lobbyId, playerId],
		);
	}
}

// Export initialized class
export const db = new DBLib();

// Default export is the initialized class
export default db;
