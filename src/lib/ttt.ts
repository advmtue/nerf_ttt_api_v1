import * as pgpromise from 'pg-promise';
import { Game } from '../models/game';

// TTT Related logic libs

/**
 * Inline functions to pull the number of a specific role per number of players
 */
const roleRatios = {
	'TRAITOR': (playerCount: number) => Math.ceil(playerCount / 6),
	'DETECTIVE': (playerCount: number) => Math.ceil(playerCount / 9),
};

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
	const playerRole = game.players.find((pl) => pl.id === playerId);

	// If player isn't in the game, don't filter
	if (!playerRole) {
		return game;
	}

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

	let traitorCount = roleRatios['TRAITOR'](unassigned.length);
	let detectiveCount = roleRatios['DETECTIVE'](unassigned.length);

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
