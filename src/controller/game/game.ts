/**
 * Game logic component
 */
import { EventEmitter } from 'events';
import { logger } from '../../lib/logger';
import { Game, GamePlayer } from '../../models/game';
import { Player } from '../../models/player';
import * as Role from '../../models/gamerole';
import { roleConfig } from '../../lib/utils';

// Interface for logging kills.
// Unsure how it's going to be used down the track
interface KillLog {
	killer: number; // Player ID
	victim: number; // Victim ID
	timestamp: number; // Seconds into the round
}

const DEFAULTS = {
	PREGAME_TIME: 60 * 1000,
	GAME_LENGTH: 1 * 60 * 1000,
}

// Game instance, emits various events
// TODO: List the events
export class GameRunner extends EventEmitter {
	private game: Game;
	private kills: KillLog[];

	constructor(game: Game) {
		// Do event emitter things
		super();

		logger.info(`GAME#${game.id} -- Created`);

		this.game = game;

		// Init
		this.kills = [];

		const timeUntil = (new Date(game.date_created)).valueOf() - Date.now();

		// Consider pregame
		if (game.status === 'LOBBY') {
			logger.info(`GAME#${game.id} -- Created lobby`);
			// No timers or anything.
		} else if (game.status === 'PREGAME') {
			// Set a timer for game start

			// debug: start game in 10 seconds
			setTimeout(() => this.startGame(), timeUntil);
		} else if (game.status === 'INGAME') {
			// Set a timer for game end

			// This route is only hit from crash recovery
			// I don't know if its worth it

			// End the game in 10 seconds
			setTimeout(() => this.endGame(), 10000);
		} else if (game.status === 'ENDED') {
			logger.warn(`GAME#${game.id} -- Registered ended game`);
		} else {
			logger.warn(`GAME#${game.id} -- Registered cancelled game`);
		}
	}

	get state() {
		return this.game;
	}

	// Retrieve a GamePlayer from a playerId
	// If the player is not in this game, return null;
	getPlayer(playerId: number): GamePlayer | null {
		const player = this.game.players.filter((pl) => pl.id === playerId);

		if (player.length === 0) {
			return null;
		} else {
			return player[0];
		}
	}

	/**
	 * Close the game early
	 * @param byAdmin True if Admin force close
	 */
	closeGame(byAdmin: boolean) {
		// TODO Deal with all states
		if (this.game.status !== 'LOBBY') {
			throw new Error('Game is not in lobby phase');
		}

		this.game.status = byAdmin ? 'CLOSED_ADMIN' : 'CLOSED_OWNER';
	}

	/**
	 * Player joined the lobby
	 */
	playerJoin(player: Player) {
		// Ensure we are in the lobby phase
		if (this.game.status !== 'LOBBY') {
			throw new Error('Cannot join game in progress.');
		}

		// Ensure the player isn't already in this game
		if (this.getPlayer(player.id) !== null) {
			throw new Error('Player is already in this game.');
		}

		// Extend the Player interface to GamePlayer
		const gp: GamePlayer = player as GamePlayer;
		// Assign defaults
		gp.alive = true;
		gp.role = 'INNOCENT';
		gp.ready = false;

		this.game.players.push(gp);

		return gp;
	}

	/**
	 * Player left the lobby
	 */
	playerLeave(player: Player) {
		if (this.game.status !== 'LOBBY') {
			throw new Error('Cannot leave game in progress.');
		}

		this.game.players = this.game.players.filter((pl) => pl.id !== player.id);
	}

	/**
	 * Player Ready up
	 */
	playerReadyUp(player: Player) {
		if (this.game.status !== 'LOBBY') {
			throw new Error('Cannot change status in a non-lobby game');
		}

		const gPlayer = this.game.players.find(pl => pl.id === player.id);

		if (!gPlayer) {
			throw new Error('Player is not in this game.');
		}

		gPlayer.ready = true;
	}

	/**
	 * Player Unready
	 */
	playerUnready(player: Player) {
		if (this.game.status !== 'LOBBY') {
			throw new Error('Cannot change status in a non-lobby game');
		}

		const gPlayer = this.game.players.find(pl => pl.id === player.id);

		if (!gPlayer) {
			throw new Error('Player is not in this game.');
		}

		gPlayer.ready = false;
	}

	// Expose game id
	get id() {
		return this.game.id;
	}

	logPlayers() {
		this.game.players.forEach(pl => {
			logger.info(`GAME#${this.game.id} (${pl.role} - ${pl.name})`);
		});
	}

	assignRoles() {
		let unassigned = this.game.players;

		// Determine number of particular role
		let traitorCount = roleConfig['TRAITOR'].ratio(unassigned.length);
		let detectiveCount = roleConfig['DETECTIVE'].ratio(unassigned.length);

		/**
		  Assignment:
			Pick a random player from a pool of available players
			For each role count, determine if we still need to allocate players
				If so, allocate this player to that role
				If not, allocate the player to innocent
			Remove the player from the pool of avaialble players
		*/

		const roles: GamePlayer[] = [];

		while (unassigned.length > 0) {
			// Pick player from the pool of unassigned players
			const pl = unassigned[Math.floor(Math.random() * unassigned.length)];

			if (traitorCount > 0) {
				pl.role = 'TRAITOR';
				traitorCount -= 1;
			} else if (detectiveCount > 0) {
				pl.role = 'DETECTIVE';
				detectiveCount -= 1;
			} else {
				// All roles have been filled, assign to innocent
				pl.role = 'INNOCENT';
			}

			roles.push(pl);

			// Remove the player from the pool of available players
			unassigned = unassigned.filter((ply) => ply.id !== pl.id);
		}

		console.log(this.game.players);
	}

	// Start the game
	startGame() {
		if (this.game.status !== 'LOBBY') {
			logger.warn('Cannot start a game that is not in LOBBY phase.');
			return;
		}

		// Assign roles
		this.assignRoles();

		// Set game status
		this.game.status = 'PREGAME';

		logger.info(`GAME#${this.game.id} -- Pregame`);

		// Set launch time
		this.game.date_launched = new Date(Date.now() + DEFAULTS.PREGAME_TIME);

		// Go into real game after 60 seconds
		setTimeout(() => this.activate(), DEFAULTS.PREGAME_TIME);

		this.emit('pregame');
	}

	activate() {
		this.game.status = 'INGAME';

		// End game in 10 seconds
		this.game.date_ended = new Date(Date.now() + DEFAULTS.GAME_LENGTH);
		setTimeout(() => this.endGame(), DEFAULTS.GAME_LENGTH);

		this.emit('start');
	}

	endGame() {
		this.game.status = 'ENDED';

		// Clear all timers

		this.checkTimeWinConditions();

		this.emit('emit');
	}

	/**
	 * Player registered their killer
	 */
	playerKilledPlayer(killer: GamePlayer, victim: GamePlayer) {
		if (!victim.alive) {
			logger.warn(`GAME#${this.game.id}(KILL-VICTIM) -- ${victim.name} not alive`);
			return false;
		} else if (!killer.alive) {
			logger.warn(`GAME#${this.game.id}(KILL-KILLER) -- ${killer.name} not alive`);
			return false;
		} else if (this.game.status !== 'INGAME') {
			logger.warn(`GAME#${this.game.id}(KILL) -- Game not in progress`);
			return false;
		}

		// Add to kill log
		this.kills.push({
			killer: killer.id,
			victim: victim.id,
			timestamp: 0
		});

		victim.alive = false;

		this.emit('playerkilledPlayer', { killer, victim });

		this.checkDeathWinConditions();

		return true;
	}

	// Game time expired
	checkTimeWinConditions() {
		// Detective alive
		let detectivesAlive = this.game.players.filter((pl) => {
			return pl.role === 'DETECTIVE' && pl.alive;
		}).length;

		if (detectivesAlive === 0) {
			// Traitor victory
			this.teamWin('TRAITOR');
		} else {
			// Innocent victory
			this.teamWin('INNOCENT');
		}
	}

	// onDeath wincondition check
	checkDeathWinConditions() {
		let traitorsAlive = this.game.players.filter((pl) => {
			return pl.role === 'TRAITOR' && pl.alive;
		}).length;

		// Innocent victory
		if (traitorsAlive === 0) {
			this.teamWin('INNOCENT');
			return;
		}

		let playersAlive = this.game.players.filter((pl) => pl.alive).length;

		// Traitor victory
		if (playersAlive === traitorsAlive) {
			this.teamWin('TRAITOR');
		}
	}

	// Register a team win
	teamWin(teamName: Role.Innocent | Role.Traitor) {
		logger.info(`GAME#${this.game.id} -- ${teamName} win`);
		this.emit('gameEnd', { team: teamName });
	}

	// detectiveUseReveal(detective: GamePlayer, target: GamePlayer) {}
}
