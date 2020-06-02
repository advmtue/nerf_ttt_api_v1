import { connection } from './connection';

import * as tttlib from '../../lib/ttt';
import { logger } from '../../lib/logger';
import { GameState, GameConfig, PlayerGameState } from '../../models/game';

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

/**
 * Create a game derived from a given lobby
 * Assumes ALL preconditions have been met
 *
 * @param lobbyId Lobby ID
 * @returns Game ID
 */
export async function create(lobbyId: number) {
	// Create the new game
	await connection.query(
		'CALL new_game($1)',
		[lobbyId],
	);

	// Get last gameId
	const gameId = await getLobbyLatest(lobbyId);

	// Get player IDs
	const ids = await connection.query(
		'SELECT player_id FROM lobby_player WHERE lobby_id = $1',
		[lobbyId],
	);

	const idArray: number[] = [];
	ids.rows.forEach((pl) => idArray.push(pl.player_id as number));

	// Assign the roles
	const roles = tttlib.assignRoles(idArray);
	logger.info(roles);

	// Build the insert query string
	const rolesQueryString = tttlib.buildRolesQuery(gameId, roles);
	logger.info(rolesQueryString);

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
	const q = await connection.query(
		'SELECT * FROM game_public WHERE id = $1',
		[gameId],
	);

	if (q.rowCount === 0) {
		throw new Error('Game not found');
	}

	// Determine seconds left
	// TODO

	// Create config structure
	const c: GameConfig = {
		priest: q.rows[0].config_priest || false,
		madman: q.rows[0].config_madman || false,
	};

	// Create gamestate structure
	const gs: GameState = {
		id: q.rows[0].id,
		lobby_id: q.rows[0].lobby_id,
		seconds_left: 0, // TODO
		round_number: q.rows[0].round_number,
		config: c,
		status: q.rows[0].status,
		detectives: [], // TODO
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
	// Pull player game state
	const playerInfo = await connection.query(
		'SELECT role, alive FROM game_player WHERE player_id = $1',
		[playerId],
	);

	// Player isn't part of this lobby
	if (playerInfo.rowCount === 0) {
		throw new Error('Player not found in lobby');
	}

	// Pull the game state
	const gameInfo = await get(gameId);

	const pgs = gameInfo as PlayerGameState;
	pgs.role = playerInfo.rows[0].role;
	pgs.alive = playerInfo.rows[0].alive;
	pgs.buddies = [];

	return pgs;
}
