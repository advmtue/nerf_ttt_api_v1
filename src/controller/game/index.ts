import { GameRunner } from './game';
import { Game, GameLobby, GamePlayer } from '../../models/game';
import { logger } from '../../lib/logger';
import { EventEmitter } from 'events';
import { Player } from '../../models/player';

import { filterGameState, gameRunnerToLobby } from '../../lib/utils';

export class GameManager extends EventEmitter {
	private activeGames: GameRunner[];

	constructor() {
		super();

		this.activeGames = [];
	}

	addGame(game: Game) {
		logger.info(`GC -- Adding new game ${game.id}`);

		const g = new GameRunner(game);

		this.activeGames.push(g);

		// On game start, emit start event
		g.on('start', () => this.emit('start', g));
		g.on('end', () => this.emit('end', g));
		g.on('pregame', () => this.emit('pregame', g));
		g.on('playerDeath', (p: GamePlayer) => this.emit('playerDeath', g, p));

		// Emit newGame event
		this.emit('new', g);
	}

	private get(gameId: number) {
		// O(n^2) :shrug:
		const g = this.activeGames.find(game => game.id === gameId);

		if (!g) {
			throw new Error('Game not found');
		}

		return g;
	}

	playerStartGame(gameId: number, player: Player) {
		const g = this.get(gameId);

		// Ensure the caller is owner
		if (g.state.owner.id !== player.id) {
			throw new Error('Only the owner can start a lobby.');
		}

		// Ensure we meet minimum players
		if (g.state.players.length < 3) {
			throw new Error('Lobby needs more players');
		}

		// Ensure all players are ready
		if (g.state.players.find(pl => !pl.ready)) {
			throw new Error('Some players are not ready');
		}

		// Pass the rest of the logic to the game to deal with
		g.startGame();

		this.emit('gameStart', g);
	}

	getGameState(gameId: number, player: Player) {
		const g = this.get(gameId);

		return filterGameState(g.state, player);
	}

	adminClose(gameId: number) {
		const g = this.get(gameId);
		g.closeGame(true);
		this.emit('gameCloseAdmin', g);
	}

	/**
	 * Owner tries to close game
	 * @param gameId Game ID
	 */
	ownerClose(gameId: number) {
		const g = this.get(gameId);
		g.closeGame(false);
		this.emit('gameCloseOwner', g);
	}

	/**
	 * Attempt to add a player to a game
	 * @param gameId Game ID
	 * @param player Player
	 */
	addPlayerToGame(gameId: number, player: Player) {
		const game = this.get(gameId);
		const gamePlayer = game.playerJoin(player);

		this.emit('playerJoin', game, gamePlayer);
		logger.info(`GAME#${game.id} (PlayerJoin) -- ${player.name}`);
	}

	playerRegisterDeath(gameId: number, victimId: number, killerId: number) {
		const game = this.get(gameId);

		const player = game.playerKilledPlayer(victimId, killerId);

		logger.info(`GAME#${gameId} (playerDied) => ${player.name}`);

		this.emit('playerDeath', game, player);
	}

	/**
	 * Attempt to remove a player from a game
	 * @param gameId Game ID
	 * @param player Player
	 */
	removePlayerFromGame(gameId: number, player: Player) {
		const game = this.get(gameId);
		game.playerLeave(player);

		this.emit('playerLeave', game, player);
		logger.info(`GAME#${game.id} (PlayerLeave) -- ${player.name}`);
	}

	/**
	 * Attempt to ready up a player
	 * @param gameId Game ID
	 * @param player Player
	 */
	playerReadyUp(gameId: number, player: Player) {
		const game = this.get(gameId);
		game.playerReadyUp(player);

		this.emit('playerReady', game, player)
	}

	/**
	 * Attempt to unready a player
	 * @param gameId Game ID
	 * @param player Player
	 */
	playerUnready(gameId: number, player: Player) {
		const game = this.get(gameId);
		game.playerUnready(player);

		this.emit('playerUnready', game, player)
	}

	getLobbies(): GameLobby[] {
		return this.activeGames
			.filter((game) => game.state.status === 'LOBBY')
			.map(gameRunnerToLobby);
	}
}
