// Connection
import { connection } from './connection';

// Interfaces
import { Player } from '../../models/player';
import { Lobby } from '../../models/lobby';

/**
 * Get the list of players who are participating in the lobby
 *
 * @param lobbyId The id of the lobby
 */
export async function getPlayers(lobbyId: number | string): Promise<Player[]> {
	const query = await connection.query(
		'SELECT * FROM lobby_player_public WHERE lobby_id = $1',
		[lobbyId],
	);

	return query.rows as Player[];
}

/**
 * Get the current list of lobbies that are in the WAITING phase
 */
export async function getList() {
	const q = await connection.query('SELECT * FROM lobby_public WHERE lobby_status = \'WAITING\'');
	return q.rows as Lobby[];
}

/**
 * Pull a single lobby by its ID
 *
 * @param lobbyId Lobby ID
 */
export async function get(lobbyId: number | string) {
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
 * Create a new lobby, specifiying the owner
 *
 * @param ownerId Owner of the lobby
 * @param name Lobby name
 */
export async function create(ownerId: number, name: string) {
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
export async function close(lobbyId: number, byAdmin: boolean) {
	const status = byAdmin ? 'CLOSED_BY_ADMIN' : 'CLOSED_BY_OWNER';

	await connection.query(
		'UPDATE lobby SET lobby_status = $1 WHERE "id" = $2',
		[status, lobbyId],
	);

	return 1;
}

/**
 * Pull the profile of a lobby owner
 *
 * @param lobbyId Lobby ID
 */
export async function getOwner(lobbyId: number) {
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
 *
 * @returns New lobby player count
 */
export async function addPlayer(lobbyId: number | string, playerId: number) {
	// Ensure the lobby is in waiting phase
	const status = await connection.query(
		'SELECT lobby_status, player_count FROM lobby_public WHERE id = $1',
		[lobbyId],
	);

	if (status.rowCount === 0) {
		// Lobby probably doesn't exist
		throw new Error('Lobby not found');
	} else if (status.rows[0].lobby_status !== 'WAITING') {
		// Lobby is not in the WAITING phase
		throw new Error('Lobby not in waiting phase');
	}

	// Attempt to add the player to the lobby
	const add = await connection.query(
		'INSERT INTO lobby_player (lobby_id, player_id) VALUES ($1, $2)',
		[lobbyId, playerId],
	);

	if (add.rowCount === 0) {
		throw new Error('Failed to add player to lobby');
	}

	// Return the new lobby player count
	return status.rows[0].player_count + 1;
}

/**
 * Remove a player from a lobby
 *
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 *
 * @returns New lobby player count
 */
export async function removePlayer(lobbyId: number | string, playerId: number) {
	// Ensure the lobby is in waiting phase
	const status = await connection.query(
		'SELECT lobby_status, player_count FROM lobby_public WHERE id = $1',
		[lobbyId],
	);

	if (status.rowCount === 0) {
		// Lobby probably doesn't exist
		throw new Error('Lobby not found');
	} else if (status.rows[0].lobby_status !== 'WAITING') {
		// Lobby is not in the WAITING phase
		throw new Error('Lobby not in waiting phase');
	}

	// Attempt to remove the player from the lobby
	const add = await connection.query(
		'DELETE FROM lobby_player WHERE lobby_id = $1 AND player_id = $2',
		[lobbyId, playerId],
	);

	if (add.rowCount === 0) {
		throw new Error('Failed to remove player from lobby');
	}

	// Return the new lobby player count
	return status.rows[0].player_count - 1;
}

/**
 * Player ready
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 */
export async function setPlayerReady(lobbyId: number| string, playerId: number) {
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
export async function setPlayerUnready(lobbyId: number | string, playerId: number) {
	await connection.query(
		'UPDATE lobby_player SET ready = FALSE WHERE lobby_id = $1 AND player_id = $2',
		[lobbyId, playerId],
	);
}

/**
 * Start a lobby.
 * Sets lobby_status = IN_PROGRESS
 * Creates a new game from the given lobby
 *
 * We exec multiple queries to give finer details on errors.
 * It is possible to do this in less queries
 *
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 */
export async function start(lobbyId: number, playerId: number) {
	// Check lobby state is WAITING
	const state = await connection.query(
		'SELECT lobby_status FROM lobby_public WHERE id = $1',
		[lobbyId],
	);

	if (state.rowCount === 0) {
		throw new Error('Could not find lobby specified');
	} else if (state.rows[0].lobby_status !== 'WAITING') {
		throw new Error('Lobby is not in waiting phase');
	}

	const update = await connection.query(
		'UPDATE lobby SET lobby_status = $1 WHERE id = $2 AND owner_id = $3',
		['IN_PROGRESS', lobbyId, playerId],
	);

	// If no update occurred, the player was not the gamemaster
	if (update.rowCount === 0) {
		throw new Error('Insufficient permission to start lobby');
	}

	// TODO Create game
	return 1;
}
