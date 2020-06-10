// Various utils
import { Game } from '../models/game';
import { GameRunner } from '../controller/game/game';
import { Player } from '../models/player';

export const roleConfig = {
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

export function gameStateToLobby(game: Game) {
	return {
		id: game.id,
		owner: game.owner,
		name: game.name,
		date_created: game.date_created,
		player_count: game.players.length,
	}
}

export function gameRunnerToLobby(game: GameRunner) {
	return gameStateToLobby(game.state);
}

export function filterGameState(game: Game, player: Player) {
	const gp = game.players.find(pl => pl.id === player.id);

	// Dont filter if player isn't in game
	if (!gp) {
		return game;
	}

	const playerRole = gp.role;
	const playerCanSee = roleConfig[playerRole].can_see;

	game.players = game.players.map(pl => {
		if (!playerCanSee.includes(pl.role)) {
			pl.role = 'INNOCENT';
			pl.alive = true;
		}
		return pl;
	});

	return game;
}
