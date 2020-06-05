import * as pgpromise from 'pg-promise';
import { Game } from '../models/game';

import { logger } from './logger';

// TTT Related logic libs

/**
 * Role Configuration
 * @field ratio Function providing number of class members for a given player count
 * @field filter How a roles array should be filtered based on given player role
 */
const roleConfig = {
	'TRAITOR': {
		ratio: (playerCount: number) => Math.ceil(playerCount / 6),
		can_see: ['INNOCENT', 'DETECTIVE', 'TRAITOR'],
	},
	'DETECTIVE': {
		ratio: (playerCount: number) => Math.ceil(playerCount / 9),
		can_see: ['INNOCENT', 'DETECTIVE'],
	},
	'INNOCENT': {
		can_see: ['DETECTIVE'],
	},
}


/**
 * From a given gamestate and a playerId, filter the players so that a full
 * gamestate isn't sent to a player.
 * Mitigates the issue of players viewing the object and seeing all roles
 *
 * @param game A given game state
 * @param Player ID of a player that may or may not be in the game
 */
export function filterGameState(game: Game, playerId: number) {
	// Hide alive players status for non-traitor
	const player = game.players.find((pl) => pl.id === playerId);

	// If player isn't in the game, don't filter
	if (!player) {
		logger.warn('Short circuit');
		return game;
	}

	// Calling player's role
	const playerRole = player.role;

	// Roles that the calling player can see
	const playerCanSee = roleConfig[playerRole].can_see;

	// Any player role that shouldn't be see by caller is 'INNOCENT'
	game.players = game.players.map((pl) => {
		if (!playerCanSee.includes(pl.role)) {
			// Reassign to false innocent
			pl.role = 'INNOCENT';
		}
		return pl;
	});

	return game;
}

/**
 * Build a query to insert roles for a game into the database
 * When this is called we generally don't have a gamestate, so need to pass gameId and role array.
 *
 * @todo Change structures to use param Game instead if possible.
 *
 * @param gameId Game ID
 * @param roles {id: Player ID, role: Game Role}[]
 *
 * @returns roleQuery Parameterized query to push all players to a game
 */
export function buildRolesQuery(gameId: number, roles: {id: number, role: string}[]) {
	let qs = 'INSERT INTO game_player (game_id, player_id, role, alive) VALUES ';
	let first = true;

	roles.forEach((pl) => {
		const a = pgpromise.as.format(
			'($1, $2, $3, TRUE)',
			[gameId, pl.id, pl.role],
		);
		if (first) {
			qs = `${qs} ${a}`;
			first = false;
		} else {
			qs = `${qs}, ${a}`;
		}
	});

	return qs;
}

/**
 * Assign roles to a player list
 *
 * @param playerList List of player IDs
 */
export function assignRoles(playerList: number[]) {
	let unassigned = playerList;

	// Determine number of particular role
	let traitorCount = roleConfig['TRAITOR'].ratio(unassigned.length);
	let detectiveCount = roleConfig['DETECTIVE'].ratio(unassigned.length);

	// Allocated roles
	const roles: {id: number, role: string}[] = [];

	/**
	  Assignment:
	  	Pick a random player from a pool of available players
		For each role count, determine if we still need to allocate players
			If so, allocate this player to that role
			If not, allocate the player to innocent
		Remove the player from the pool of avaialble players
	*/

	while (unassigned.length > 0) {
		// Pick player from the pool of unassigned players
		const pl = unassigned[Math.floor(Math.random() * unassigned.length)];

		if (traitorCount > 0) {
			roles.push({ id: pl, role: 'TRAITOR' });
			traitorCount -= 1;
		} else if (detectiveCount > 0) {
			roles.push({ id: pl, role: 'DETECTIVE' });
			detectiveCount -= 1;
		} else {
			// All roles have been filled, assign to innocent
			roles.push({ id: pl, role: 'INNOCENT' });
		}

		// Remove the player from the pool of available players
		unassigned = unassigned.filter((ply) => ply !== pl);
	}

	return roles;
}
