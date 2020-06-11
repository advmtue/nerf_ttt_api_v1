// Various utils
import { Game } from '../models/game';
import { GameRunner } from '../controller/game/game';
import { Player } from '../models/player';

/**
 * Configuration for what roles can do within the game
 * @todo Make this into some sort of static method?
 */
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

/**
 * Convert a game state to GameLobby interface
 * @todo remove most instances and replace with gr.toLobby()
 */
export function gameStateToLobby(game: Game) {
	return {
		id: game.id,
		owner: game.owner,
		name: game.name,
		date_created: game.date_created,
		player_count: game.players.length,
	}
}

/**
 * Convert a game runner to Lobby
 * @todo Convert game to a class and add prototype
 */
export function gameRunnerToLobby(game: GameRunner) {
	return gameStateToLobby(game.state);
}

/**
 * Filter the game state based on a given player's role in the game.
 * If the player isn't in the game, don't filter.
 * If the game state isn't INGAME or PREGAME, don't filter.
 *
 * Player can only see role.can_see, and their personal alive status.
 *
 * @param g Game state
 * @param player Reference player
 */
export function filterGameState(g: Game, player: Player) {
	// Only filter 'ACTIVE' game states
	if (g.status !== 'INGAME' && g.status !== 'PREGAME') {
		return g;
	}

	// Search for the filter player within game
	const gp = g.players.find(pl => pl.id === player.id);

	// Dont filter if player isn't in game
	if (!gp) {
		return g;
	}

	const playerRole = gp.role;
	const playerCanSee = roleConfig[playerRole].can_see;

	g.players = g.players.map(pl => {
		if (!playerCanSee.includes(pl.role)) {
			pl.role = 'INNOCENT';
			pl.alive = pl.id === gp.id ? gp.alive : true;
		}
		return pl;
	});

	return g;
}
