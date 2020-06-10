import { Client } from 'pg';

import * as tttlib from '../../lib/ttt';
import { logger } from '../../lib/logger';

import { Game, GameConfig, GamePlayer } from '../../models/game';
import { Database } from './';

export class DBGameController {
	constructor(private db: Database, private connection: Client) {
	}

	/**
	 * DBGameController - Houses data access for game-related queries
	 */

	/**
	 * Get players active in a game
	 *
	 * @param gameId Game ID
	 */
	async getPlayers(gameId: number) {
		const q = await this.connection.query(
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
	async create(name: string, ownerId: number) {
		// Insert a new game into the db
		const q = await this.connection.query(
			'INSERT INTO game (name, owner_id) VALUES ($1, $2) RETURNING id, date_created',
			[name, ownerId]
		);

		// Ensure it was inserted
		if (q.rowCount === 0) {
			throw new Error('Failed to create new game.');
		}


		// Assemble a game
		const g: Game = {
			id: q.rows[0].id,
			name,
			date_created: new Date(q.rows[0].date_created),
			date_launched: null,
			date_ended: null,
			config: null,
			status: 'LOBBY',
			owner: await this.db.player.get(ownerId),
			players: [],
		}

		return g;
	}

	/**
	 * Get game state for game with matching ID
	 *
	 * @param gameId Game ID
	 */
	async get(gameId: number) {
		// Pull game base info
		const q = await this.connection.query(
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
			name: q.rows[0].name,
			date_created: new Date(q.rows[0].date_created),
			date_launched: new Date(q.rows[0].date_launched) || null,
			date_ended: new Date(q.rows[0].date_ended) || null,
			config: c,
			status: q.rows[0].status,
			players: await this.getPlayers(gameId),
			owner: await this.db.player.get(q.rows[0].owner_id),
		};


		return gs;
	}

	async adminClose(gameId: number) {
		await this.connection.query(
			'UPDATE game SET status = $1 WHERE id = $2',
			['CLOSED_ADMIN', gameId]
		);
	}

	/**
	 * Pull the lobby state for a given player
	 *
	 * @param gameId  Game ID
	 * @param playerId Player ID
	 */
	async playerGameState(gameId: number, playerId: number) {
		// Pull the game state
		const gameInfo = await this.get(gameId);

		return tttlib.filterGameState(gameInfo, playerId);
	}
}
