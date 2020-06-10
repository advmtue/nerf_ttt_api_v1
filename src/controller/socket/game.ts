import { GameManager } from '../game';
import { Database } from '../database';

// Libs
import { logger } from '../../lib/logger';
import { gameStateToLobby } from '../../lib/utils';

// Models
import { Game, GamePlayer } from '../../models/game';

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
	}

	// Apply routes for authenticated socket
	applyRoutes(socket: SocketIO.Socket) {
		// Do nothing for inbound routes here
		// Configure them in SocketGameInController
	}

	// Admin closed the game
	gameCloseAdmin(game: Game) {
		this.io.to(`game ${game.id}`).emit('gameCloseAdmin');
		this.io.to('lobbyListUpdate').emit('removeLobby', game.id);
	}

	// Owner closed the game
	gameCloseOwner(game: Game) {
		this.io.to(`game ${game.id}`).emit('gameCloseOwner');
		this.io.to('lobbyListUpdate').emit('removeLobby', game.id);
	}

	// Player Joined
	playerJoin(game: Game, player: GamePlayer) {
		this.io.to(`game ${game.id}`).emit('playerJoin', player);
		this.io.to('lobbyListUpdate').emit('lobbyPlayerChange', game.id, game.players.length);
	}

	// Player Left
	playerLeave(game: Game, player: GamePlayer) {
		this.io.to(`game ${game.id}`).emit('playerLeave', player.id);
		this.io.to('lobbyListUpdate').emit('lobbyPlayerChange', game.id, game.players.length);
	}

	// Player Ready Up
	playerReady(game: Game, player: GamePlayer) {
		this.io.to(`game ${game.id}`).emit('playerReady', player.id);
	}

	// Player Unready
	playerUnready(game: Game, player: GamePlayer) {
		this.io.to(`game ${game.id}`).emit('playerUnready', player.id);
	}

	// Game start
	gameStart(game: Game) {
		this.io.to(`game ${game.id}`).emit('gameStart');
	}

	// Game pregame
	gamePregame(game: Game) {
		this.io.to(`game ${game.id}`).emit('gamePregame');
	}

	// Game end
	// TODO Winning team?
	gameEnd(game: Game) {
		this.io.to(`game ${game.id}`).emit('gameEnd');
	}

	// Player died
	// TODO figure out who to filter this to
	playerDeath(game: Game, player: GamePlayer) {
		this.io.to(`game ${game.id}`).emit('playerDeath', player.id);
	}

	// New game created
	newGame(game: Game) {
		logger.info('LobbyListUpdate -> addLobby');
		const lobby = gameStateToLobby(game);
		this.io.to('lobbyListUpdate').emit('addLobby', lobby);
	}
}
