import { connection } from './connection';

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

	// Get the ID for the game
	return getLobbyLatest(lobbyId);
}
