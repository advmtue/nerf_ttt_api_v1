import { GameManager } from '../game';
import { Database } from '../database';

// Libs
import { logger } from '../../lib/logger';
import { gameStateToLobby } from '../../lib/utils';

// Models
import { Game, GamePlayer } from '../../models/game';
import { filterGameState } from '../../lib/utils';
import { GameRunner } from '../game/game';

// Controller for externally generated events
export class SocketGameInController {
	constructor(
		private io: SocketIO.Server,
		private gc: GameManager,
		private db: Database
	) {
		// Do nothing for outbound routes
		// Configure them in SocketGameOutController
	}

	applyRoutes(socket: SocketIO.Socket) {
		socket.on('getLobbyList', this.getLobbyList.bind(this, socket));
		socket.on('getGame', this.getGame.bind(this, socket));
		socket.on('playerRegisterDeath', this.playerRegisterDeath.bind(this, socket));
	}

	playerRegisterDeath(socket: SocketIO.Socket, gameId: number, killerId: number) {
		console.log('playerRegisterDeath', gameId, killerId);
		// Try to push the death to the GC
		if (!socket.player) return;

		try {
			this.gc.playerRegisterDeath(gameId, socket.player.id, killerId);
		} catch (error) {
			logger.error(error);
		}
	}

	// Get a lobby and become a listener for events
	getLobbyList(socket: SocketIO.Socket) {
		socket.join('lobbyListUpdate');
		socket.emit('getLobbyList', this.gc.getLobbies());
	}

	// Get a game and become a listener for events
	getGame(socket: SocketIO.Socket, gameId: number) {
		if (!socket.player) return;

		try {
			socket.join(`game ${gameId}`);
			socket.emit('getGame', this.gc.getGameState(gameId, socket.player));
		} catch (error) {
			logger.error(error);
		}
	}
}

// Controller for internally generated events
export class SocketGameOutController {
	constructor(
		private io: SocketIO.Server,
		private gc: GameManager,
		private db: Database
	) {
		gc.on('new', this.newGame.bind(this));
		gc.on('playerJoin', this.playerJoin.bind(this));
		gc.on('playerLeave', this.playerLeave.bind(this));
		gc.on('playerReady', this.playerReady.bind(this));
		gc.on('playerUnready', this.playerUnready.bind(this));
		gc.on('pregame', this.gamePregame.bind(this));
		gc.on('start', this.gameStart.bind(this));
		gc.on('end', this.gameEnd.bind(this));
		gc.on('playerDeath', this.playerDeath.bind(this));
		gc.on('gameCloseAdmin', this.gameCloseAdmin.bind(this));
		gc.on('gameCloseOwner', this.gameCloseOwner.bind(this));
		gc.on('timerUpdate', this.timerUpdate.bind(this));
	}

	// Apply routes for authenticated socket
	applyRoutes(socket: SocketIO.Socket) {
		// Do nothing for inbound routes here
		// Configure them in SocketGameInController
	}

	// Send a timer update to players
	timerUpdate(gr: GameRunner, seconds: number) {
		this.io.to(`game ${gr.state.id}`).emit('timerUpdate', seconds);
	}

	// Admin closed the game
	gameCloseAdmin(gr: GameRunner) {
		this.io.to(`game ${gr.state.id}`).emit('gameCloseAdmin');
		this.io.to('lobbyListUpdate').emit('removeLobby', gr.state.id);
	}

	// Owner closed the game
	gameCloseOwner(gr: GameRunner) {
		this.io.to(`game ${gr.state.id}`).emit('gameCloseOwner');
		this.io.to('lobbyListUpdate').emit('removeLobby', gr.state.id);
	}

	// Player Joined
	playerJoin(gr: GameRunner, player: GamePlayer) {
		this.io.to(`game ${gr.state.id}`).emit('playerJoin', player);
		this.io.to('lobbyListUpdate').emit('lobbyPlayerChange', gr.state.id, gr.state.players.length);
	}

	// Player Left
	playerLeave(gr: GameRunner, player: GamePlayer) {
		this.io.to(`game ${gr.state.id}`).emit('playerLeave', player.id);
		this.io.to('lobbyListUpdate').emit('lobbyPlayerChange', gr.state.id, gr.state.players.length);
	}

	// Player Ready Up
	playerReady(gr: GameRunner, player: GamePlayer) {
		this.io.to(`game ${gr.state.id}`).emit('playerReady', player.id);
	}

	// Player Unready
	playerUnready(gr: GameRunner, player: GamePlayer) {
		this.io.to(`game ${gr.state.id}`).emit('playerUnready', player.id);
	}

	// Game start
	gameStart(gr: GameRunner) {
		logger.warn(`GAME#${gr.id} START = ${gr.state.timer}`);
		this.io.to(`game ${gr.state.id}`).emit('gameStart', gr.state.timer);
		/**
		 * We don't need to filter the game state here
		 * We can assume the player already has it if they get this event
		 */
	}

	// Game pregame
	gamePregame(gr: GameRunner) {
		gr.state.players.forEach((pl) => {
			let gameState = filterGameState(gr.state, pl);
			this.io.to(`player ${pl.id}`).emit('getGame', gameState);
		});
		// this.io.to(`game ${gr.state.id}`).emit('gamePregame');
	}

	// Game end
	// TODO Winning team?
	gameEnd(gr: GameRunner) {
		this.io.to(`game ${gr.state.id}`).emit('getGame', gr.state);
	}

	// Player died
	// TODO figure out who to filter this to
	playerDeath(gr: GameRunner, player: GamePlayer) {
		this.io.to(`game ${gr.state.id}`).emit('playerDeath', player.id);
	}

	// New game created
	newGame(gr: GameRunner) {
		logger.info('LobbyListUpdate -> addLobby');
		const lobby = gameStateToLobby(gr.state);
		this.io.to('lobbyListUpdate').emit('addLobby', lobby);
	}
}
