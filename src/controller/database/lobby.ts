// Connection
import { connection } from './connection';
import * as game from './game';
import * as player from './player';

// Interfaces
import { Player } from '../../models/player';
import { Lobby, LobbyComplete } from '../../models/lobby';

/**
 * Pull a single lobby by its ID
 *
 * @param lobbyId Lobby ID
 */
export async function get(lobbyId: number): Promise<Lobby> {
	const q = await connection.query(
		'SELECT * FROM view_lobby_public WHERE id = $1',
		[lobbyId],
	);

	// If no rows returned, lobby doesn't exist
	if (q.rows.length === 0) {
		throw new Error('Lobby query returned 0 rows');
	}

	return {
		id: Number(q.rows[0].id),
		owner: await player.get(q.rows[0].owner_id),
		name: q.rows[0].name,
		date_created: new Date(q.rows[0].date_created),
		status: q.rows[0].status,
		player_count: Number(q.rows[0].player_count),
	} as Lobby;
}

/**
 * Get the current list of lobbies that are in the WAITING phase
 */
export async function getList() {
	const lobbyIds = await connection.query('SELECT id FROM view_lobby_public WHERE status = \'WAITING\'');

	const lobbyPromises: Promise<Lobby>[] = [];

	lobbyIds.rows.forEach((l) => {
		lobbyPromises.push(get(l.id));
	});

	return Promise.all(lobbyPromises);
}

/**
 * Get player info for all players in a lobby.
 * TODO: Refactor, this is gross af.
 *
 * @param lobby Lobby
 */
export async function getPlayers(lobby: Lobby): Promise<Player[]> {
	const playerIds = await connection.query(
		'SELECT player_id FROM lobby_player WHERE lobby_id = $1',
		[lobby.id],
	);

	const pp = playerIds.rows.map((p) => player.get(p.player_id));

	return Promise.all(pp);
}

/**
 * Get the ID's of players within a lobby who are ready
 *
 * @param lobby Lobby
 */
export async function getReadyPlayers(lobby: Lobby) {
	const playerIds = await connection.query(
		'SELECT player_id FROM lobby_player WHERE lobby_id = $1 AND ready = TRUE',
		[lobby.id],
	);

	return playerIds.rows.map((p) => p.player_id as number);
}

export async function getComplete(lobbyId: number) {
	const lobby = await get(lobbyId);

	const lobbyFull = lobby as LobbyComplete;
	lobbyFull.players = await getPlayers(lobby);
	lobbyFull.ready_players = await getReadyPlayers(lobby);

	return lobbyFull;
}

/**
 * Create a new lobby, specifiying the owner
 *
 * @param ownerId Owner of the lobby
 * @param name Lobby name
 */
export async function create(owner: Player, name: string) {
	const q = await connection.query(
		'INSERT INTO lobby (owner_id, name) VALUES ($1, $2) RETURNING id',
		[owner.id, name],
	);

	// Insertion failed, throw an error
	if (q.rowCount !== 1) {
		throw new Error('Failed to create new lobby');
	}

	const lobbyId = q.rows[0].id;

	return get(lobbyId);
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
}

/**
 * Add a player to a lobby
 *
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 *
 * @returns New lobby player count
 */
export async function addPlayer(lobby: Lobby, playerId: number) {
	if (lobby.status !== 'WAITING') {
		// Lobby is not in the WAITING phase
		throw new Error('Lobby not in waiting phase');
	}

	// Attempt to add the player to the lobby
	const add = await connection.query(
		'INSERT INTO lobby_player (lobby_id, player_id) VALUES ($1, $2)',
		[lobby.id, playerId],
	);

	if (add.rowCount === 0) {
		throw new Error('Failed to add player to lobby');
	}

	// Return the new lobby player count
	return lobby.player_count + 1;
}

/**
 * Remove a player from a lobby
 *
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 *
 * @returns New lobby player count
 */
export async function removePlayer(lobby: Lobby, playerId: number) {
	if (lobby.status !== 'WAITING') {
		// Lobby is not in the WAITING phase
		throw new Error('Lobby not in waiting phase');
	}

	// Attempt to remove the player from the lobby
	const add = await connection.query(
		'DELETE FROM lobby_player WHERE lobby_id = $1 AND player_id = $2',
		[lobby.id, playerId],
	);

	if (add.rowCount === 0) {
		throw new Error('Failed to remove player from lobby');
	}

	// Return the new lobby player count
	return lobby.player_count - 1;
}

/**
 * Player ready
 * @param lobbyId Lobby ID
 * @param playerId Player ID
 */
export async function setPlayerReady(lobbyId: number | string, playerId: number) {
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
 * Check that all players are ready in a lobby
 *
 * @param lobbyId Lobby ID
 */
export async function playersAreReady(lobby: Lobby) {
	const readyPlayers = await getReadyPlayers(lobby);
	return readyPlayers.length === lobby.player_count;
}

/**
 * Get player count for lobby
 *
 * @param lobbyId Lobby ID
 */
export async function playerCount(lobbyId: number) {
	return (await connection.query(
		'SELECT COUNT(*) as player_count FROM lobby_player WHERE lobby_id = $1',
		[lobbyId],
	)).rows[0].player_count as number;
}

/**
 * Change a lobby status
 *
 * @param lobbyId Lobby ID
 * @param status Status
 */
export async function setStatus(lobby: Lobby, status: string) {
	return connection.query(
		'UPDATE lobby SET lobby_status = $1 WHERE id = $2',
		[status, lobby.id],
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
export async function start(lobby: Lobby, playerId: number) {
	// Ensure the calling player is gamemaster
	if (lobby.owner.id !== playerId) {
		throw new Error('You are not the gamemaster');
	}

	// Ensure state is still in 'WAITING'
	if (lobby.status !== 'WAITING') {
		throw new Error('Lobby is not in WAITING phase');
	}

	// Ensure all players are ready
	if (!(await playersAreReady(lobby))) {
		throw new Error('Players are not ready');
	}

	// Ensure there are the minimum number of players
	if (lobby.player_count < 3) {
		throw new Error('Lobby does not meet minimum players');
	}

	// Update state
	await setStatus(lobby, 'IN_PROGRESS');

	// Create the game
	return game.create(lobby);
}
