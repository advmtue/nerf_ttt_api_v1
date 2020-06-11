/**
 * Game logic component
 */
import * as _ from 'lodash';
import { EventEmitter } from 'events';
import { logger } from '../../lib/logger';
import { Game, GamePlayer } from '../../models/game';
import { Player } from '../../models/player';
import * as Role from '../../models/gamerole';
import { roleConfig } from '../../lib/utils';

const DEFAULTS = {
	PREGAME_TIME: 10 * 1000,
	GAME_LENGTH: 20 * 60 * 1000,
}

// Helper function
function secondsBetween(d1: Date, d2: Date) {
	return Math.abs(Math.round((d1.valueOf() - d2.valueOf()) / 1000));
}

// Game instance, emits various events
// TODO: List the events
export class GameRunner extends EventEmitter {

	constructor(private game: Game) {
		// Do event emitter things
		super();

		logger.info(`GAME#${game.id} -- Created`);

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

	// Return a deep clone of the game state
	// Cloned so no externals can mess with it
	get state() {
		return _.cloneDeep(this.game);
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

			// Remove the player from the pool of available players
			unassigned = unassigned.filter((ply) => ply.id !== pl.id);
		}
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

		// Set launch and end dates
		this.game.date_launched = new Date(Date.now() + DEFAULTS.PREGAME_TIME);
		this.game.date_ended = new Date(this.game.date_launched.valueOf() + DEFAULTS.GAME_LENGTH);

		// Activate game after pregame time
		setTimeout(() => this.activate(), DEFAULTS.PREGAME_TIME);

		// End game after pregame + game length
		setTimeout(() => this.endGame(), DEFAULTS.PREGAME_TIME + DEFAULTS.GAME_LENGTH);

		this.emit('pregame');
	}

	activate() {
		this.game.status = 'INGAME';
		this.emit('start');
	}

	endGame() {
		this.game.status = 'ENDED';

		// Clear all timers

		this.checkTimeWinConditions();
	}

	/**
	 * Player registered their killer
	 */
	playerKilledPlayer(victimId: number, killerId: number) {
		const victim = this.getPlayer(victimId);
		const killer = this.getPlayer(killerId);

		if (victim === null) {
			throw new Error('Victim is not in this game');
		}

		if (killer === null) {
			throw new Error('Killer is not in this game');
		}

		if (!victim.alive) {
			logger.warn(`GAME#${this.game.id}(KILL-VICTIM) -- ${victim.name} not alive`);
			throw new Error('Victim is already dead');
		} else if (this.game.status !== 'INGAME') {
			logger.warn(`GAME#${this.game.id}(KILL) -- Game not in progress`);
			throw new Error('Game is not in progress');
		}

		// Add to kill log
		this.game.kills.push({
			killer,
			victim,
			time: secondsBetween(new Date(), this.game.date_launched || new Date()),
		});

		victim.alive = false;

		this.checkDeathWinConditions();

		return victim;
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

		this.game.status = 'ENDED';
		this.game.winning_team = teamName;

		this.emit('end');
	}

	// detectiveUseReveal(detective: GamePlayer, target: GamePlayer) {}
}
