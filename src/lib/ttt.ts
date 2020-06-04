import * as pgpromise from 'pg-promise';
import { Game } from '../models/game';

// TTT Related logic libs

function traitorCount(playerCount: number) {
	// An occurence before each 6 players
	return Math.ceil(playerCount / 6);
}

function detectiveCount(playerCount: number) {
	// An occurence before each 9 players
	return Math.ceil(playerCount / 9);
}

function priestCount(playerCount: number) {
	// An occurence after each 12 players
	return Math.floor(playerCount / 12);
}

function madmanCount(playerCount: number) {
	// An occurence after each 12 players
	return Math.floor(playerCount / 12);
}

export function filterGameState(game: Game, playerId: number) {
	// Hide alive players status for non-traitor
	const playerRole = game.players.find((pl) => pl.id === playerId);

	// If player isn't in the game, don't filter
	if (!playerRole) {
		return game;
	}

	return game;
}

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
 * @param playerList List of player IDs
 */
export function assignRoles(playerList: number[]) {
	const playerCount = playerList.length;
	let unassigned = playerList;

	let traitorLeft = traitorCount(playerCount);
	let detectiveLeft = detectiveCount(playerCount);
	let priestLeft = priestCount(playerCount);
	let madmanLeft = madmanCount(playerCount);

	// Allocated roles
	const roles: {id: number, role: string}[] = [];

	let assigned = false;
	while (!assigned) {
		// Pick a random player
		const pl = unassigned[Math.floor(Math.random() * unassigned.length)];

		if (traitorLeft > 0) {
			// Assign to traitor
			roles.push({ id: pl, role: 'TRAITOR' });
			traitorLeft -= 1;
		} else if (detectiveLeft > 0) {
			// Assign to detective
			roles.push({ id: pl, role: 'DETECTIVE' });
			detectiveLeft -= 1;
		} else if (priestLeft) {
			// Assign to priest
			roles.push({ id: pl, role: 'PRIEST' });
			priestLeft -= 1;
		} else if (madmanLeft > 0) {
			// Assign to madman
			roles.push({ id: pl, role: 'MADMAN' });
			madmanLeft -= 1;
		} else {
			roles.push({ id: pl, role: 'INNOCENT' });
		}

		// Remove player from pool
		unassigned = unassigned.filter((ply) => ply !== pl);

		if (unassigned.length === 0) {
			assigned = true;
		}
	}

	return roles;
}
export default assignRoles;
