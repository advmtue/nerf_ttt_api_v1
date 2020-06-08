import { connection } from './connection';

import * as tttlib from '../../lib/ttt';
import { logger } from '../../lib/logger';
import { Game, GameConfig, GamePlayer } from '../../models/game';
import { Lobby } from '../../models/lobby';

/**
 * Pull the latest game ID for a given lobby
 *
 * @param lobbyId Lobby ID
 */
export async function getLobbyLatest(lobbyId: number) {
	const q = await connection.query(
		'SELECT id FROM main.game WHERE lobby_id = $1 ORDER BY round_number DESC LIMIT 1',
		[lobbyId],
	);

	if (q.rowCount === 0) {
		throw new Error('No games found for lobby');
	}

	return q.rows[0].id;
}

export async function getPlayers(gameId: number) {
	const q = await connection.query(
		'SELECT role, alive, id, name, emoji, colour FROM view_game_players WHERE game_id = $1',
		[gameId],
	);

	return q.rows.map((pl) => ({
		id: pl.id,
		name: pl.name,
		emoji: pl.emoji,
		colour: pl.colour,
		role: pl.role,
		alive: pl.alive,
	} as GamePlayer));
}

/**
 * Create a game derived from a given lobby
 * Assumes ALL preconditions have been met
 *
 * @param lobbyId Lobby ID
 * @returns Game ID
 */
export async function create(lobby: Lobby) {
	// Create the new game
	await connection.query(
		'CALL new_game($1)',
		[lobby.id],
	);

	// Get last gameId
	const gameId = await getLobbyLatest(lobby.id);

	// Get player IDs
	const ids = await connection.query(
		'SELECT player_id FROM lobby_player WHERE lobby_id = $1',
		[lobby.id],
	);

	const idArray: number[] = [];
	ids.rows.forEach((pl) => idArray.push(pl.player_id as number));

	// Assign the roles
	const roles = tttlib.assignRoles(idArray);
	logger.info(roles);

	// Build the insert query string
	const rolesQueryString = tttlib.buildRolesQuery(gameId, roles);

	// Insert into DB
	await connection.query(rolesQueryString);

	// Return the new game ID
	return gameId;
}

/**
 * Get game state for game with matching ID
 *
 * @param gameId Game ID
 */
export async function get(gameId: number) {
	// Pull game base info
	const q = await connection.query(
		'SELECT * FROM game_public WHERE id = $1',
		[gameId],
	);

	if (q.rowCount === 0) {
		throw new Error('Game not found');
	}


	// Determine seconds left
	// TODO
	logger.info((q.rows[0].date_launched - Date.now()) / 1000);

	// Assign game configuration
	// TODO: Define the roles according to the game model
	const c: GameConfig = {
	};

	// Create gamestate structure
	const gs: Game = {
		id: gameId,
		lobby_id: q.rows[0].lobby_id,
		next_time: q.rows[0].date_launched,
		round_number: q.rows[0].round_number,
		config: c,
		status: q.rows[0].status,
		players: await getPlayers(gameId),
		owner_id: q.rows[0].owner_id,
	};


	return gs;
}

/**
 * Pull the lobby state for a given player
 *
 * @param gameId  Game ID
 * @param playerId Player ID
 */
export async function playerGameState(gameId: number, playerId: number) {
	// Pull the game state
	const gameInfo = await get(gameId);

	return tttlib.filterGameState(gameInfo, playerId);
}
