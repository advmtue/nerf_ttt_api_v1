import {Client} from 'pg';
import {postgresConfig} from '../config';
import {PlayerLogin, PlayerProfile} from '../models/player';
import {Lobby} from '../models/lobby';

class DBLib {
	client: Client;

	constructor() {
		this.client = new Client(postgresConfig);
	}

	async connect() {
		await this.client.connect();
		await this.client.query('SET search_path TO main');
	}

	/*
	   Change a player's password if the curpwdHash matches
	   Returns a boolean representing the success status of the call
	 */
	async setPlayerPassword(pwHash: string, id: number, curpwHash: string) {
		const updateQuery = await this.client.query(
			'UPDATE "player" SET "password_reset" = false, "password" = $1 WHERE "id" = $2 AND "password" = $3',
			[pwHash, id, curpwHash]
		);

		return updateQuery.rowCount === 1;
	}

	/*
	   Get a list of players who are participating in a lobby
	 */
	async getLobbyPlayers(lobbyId: number | string): Promise<PlayerProfile[]> {
		const query = await this.client.query(
			'SELECT * FROM lobby_player_public WHERE lobby_id = $1',
			[lobbyId]
		);

		return query.rows as PlayerProfile[];
	}
	/*
	   Get any players whose login credentials matches the provided params
	   Can return an empty row, representing failed login
	 */
	async getPlayerLogin(username: string, pw: string): Promise<PlayerLogin> {
		const query = await this.client.query(
			'SELECT "id", "password_reset", "group" FROM "player" WHERE "username"=$1 and "password"=$2;',
			[username, pw]
		);

		// Only grab the first player
		if (query.rows.length !== 1) {
			throw new Error("PlayerLogin query didn\'t return 1 row");
		}

		// Return the player
		return query.rows[0] as PlayerLogin;
	}

	/*
	   From a groupId, get the permissions for that group
	   Returns a list of strings, representing the permissions
	   Eg. ['canCreateLobby', 'canLogin', 'canSomething'] etc
	 */
	async getGroupPermissions(groupId: string) {
		const permissions = await this.client.query(
			'SELECT "permission_name" FROM "group_permission" WHERE "group_name" = $1;',
			[groupId]
		);

		// Extract permission names into a list
		const permissionList: string[] = [];
		permissions.rows.forEach((item: {permission_name: string}) => permissionList.push(item.permission_name));

		return permissionList;
	}

	/*
	   Get the public lobby list
	 */
	async getLobbyList() {
		const q = await this.client.query('SELECT * FROM lobby_public WHERE lobby_status = \'WAITING\'');
		const lobbies: Lobby[] = q.rows;
		return lobbies;
	}

	/*
	   Get a lobby by a given ID
	   Throws an error if the lobby cannot be found
	 */
	async getLobby(lobbyId: number | string) {
		const q = await this.client.query(
			'SELECT * FROM lobby_public WHERE id = $1',
			[lobbyId]
		);

		if (q.rows.length === 0) {
			throw new Error('Lobby query returned 0 rows');
		}

		const lobby: Lobby = q.rows[0];
		return lobby;
	}

	/*
	   Get the full player listing. This should be cleaned up to segment at some point
	 */
	async getPlayerList() {
		const q = await this.client.query('SELECT * FROM player_public')
		return q.rows as PlayerProfile[];
	}

	/*
	   Get a profile for a given player
	   Throws error if the player cannot be found
	 */
	async getPlayerProfile(playerId: number | string) {
		const q = await this.client.query(
			'SELECT * FROM player_profile WHERE id = $1;',
			[playerId]
		);

		if (q.rows.length === 0) {
			throw new Error('Player query returned 0 rows');
		}

		const player: PlayerProfile = q.rows[0];
		return player;
	}

	/*
	   Create a new lobby
	 */
	async createLobby(ownerId: number, name: string) {
		const q = await this.client.query(
			'INSERT INTO lobby (owner_id, name) VALUES ($1, $2)',
			[ownerId, name]
		);

		// Fail if nothing happened
		if (q.rowCount !== 1) {
			return {id: -1};
		}

		const q2 = await this.client.query(
			'SELECT * FROM lobby_public WHERE owner_id = $1 and name = $2 LIMIT 1',
			[ownerId, name]
		)

		if (q2.rowCount !== 1) {
			return {id: -1};
		}

		const lobby: Lobby = q2.rows[0];
		return lobby;
	}

	async closeLobby(lobbyId: number, byAdmin: boolean) {
		const status = byAdmin ? 'CLOSED_BY_ADMIN' : 'CLOSED_BY_OWNER';

		const q = await this.client.query(
			'UPDATE lobby SET lobby_status = $1 WHERE "id" = $2',
			[status, lobbyId]
		)

		return 1;
	}

	/*
	   Check if a group has permission to perform a task
	 */
	async groupHasPermission(groupId: string, permissionName: string) {
		const q = await this.client.query(
			'SELECT permission_name FROM group_permission WHERE group_name = $1',
			[groupId]
		);

		// Iterate the permission list
		let hasPermission = false;
		q.rows.forEach(perm => {
			const pname = perm['permission_name'];
			if (pname === 'all' || pname == permissionName) {
				hasPermission = true;
			}
		});

		return hasPermission;
	}

	/*
	   Get the owner of a lobby as a playerProfile
	 */
	async lobbyGetOwnerProfile(lobbyId: number) {
		const q = await this.client.query(
			'SELECT * FROM main.player_public WHERE id = (SELECT owner_id from main.lobby WHERE id = $1)',
			[lobbyId]
		);

		if (q.rowCount !== 1) {
			throw new Error('Could not retrieve player profile for given lobby');
		}

		return q.rows[0] as PlayerProfile;
	}

	/*
	   Add a player to the lobby
	   Returns success status as boolean
	 */
	async lobbyAddPlayer(lobbyId: number | string, playerId: number) {
		try {
			const q = await this.client.query(
				'INSERT INTO lobby_player (lobby_id, player_id) VALUES ($1, $2)',
				[lobbyId, playerId]
			)

			console.log('Rows for joining player', q.rows);
			return true;
		} catch {
			// Failed unique constraint
			return false;
		}
	}
}

export const db = new DBLib();
