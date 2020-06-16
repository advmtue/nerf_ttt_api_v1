import * as _ from 'lodash';
import { EventEmitter } from 'events';
import { logger } from '../../lib/logger';
import { Game, GamePlayer } from '../../models/game';
import { Player } from '../../models/player';
import * as Role from '../../models/gamerole';
import { roleConfig } from '../../lib/utils';

// Time defaults for game
// TODO Ability to change with game config
const DEFAULTS = {
	PREGAME_TIME: 20,
	GAME_LENGTH: 20 * 60,
	DETECTIVE_REVEALS: 3,
}

// Helper function to determine seconds between two dates
function secondsBetween(d1: Date, d2: Date) {
	return Math.abs(Math.round((d1.valueOf() - d2.valueOf()) / 1000));
}

// Game instance, emits various events
// TODO: List the events as comments
export class GameRunner extends EventEmitter {

	private timerUpdate: NodeJS.Timeout | undefined;

	constructor(private game: Game) {
		super();

		// Consider pregame
		if (game.status === 'LOBBY') {
			logger.info(`GAME#${game.id} -- Created lobby`);
			// No timers or anything.
		} else {
			logger.warn(`GAME#${game.id} -- Registration where status = ${this.game.status}`);
		}
	}

	/**
	 * Deep clone the game state and return it so users cannot modify it
	 */
	get state() {
		return _.cloneDeep(this.game);
	}

	/**
	 * Attempt to retrieve a game player from playerId
	 * If player is not in the game, returns null.
	 */
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
		// Game must be in the lobby phase
		if (this.game.status !== 'LOBBY') {
			throw new Error('Cannot join game in progress.');
		}

		// Player cannot already be in the game
		if (this.getPlayer(player.id) !== null) {
			throw new Error('Player is already in this game.');
		}

		// Extend the Player interface to GamePlayer
		const gp: GamePlayer = player as GamePlayer;
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

		// Remove them from the lobby. Works if they aren't in it.
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

		// (Error) Player isn't in the game.
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

		// (Error) Player isn't in the game.
		if (!gPlayer) {
			throw new Error('Player is not in this game.');
		}

		gPlayer.ready = false;
	}

	// Expose game id
	get id() {
		return this.game.id;
	}

	/**
	 * Allocate roles to all players within the game.
	 */
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
			Remove the player from the pool of available players
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
				// Give the detective the default number of reveals
				// TODO use game config
				pl.reveals = DEFAULTS.DETECTIVE_REVEALS;
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

		// Start / End times
		this.game.timer = DEFAULTS.PREGAME_TIME;

		// Emit a time update every 5 seconds
		this.timerUpdate = setInterval(this.tick.bind(this), 1000);

		this.emit('pregame');
	}

	tick() {
		logger.info(`GAME#${this.game.id} tick = ${this.game.timer}`);

		this.game.timer--;

		// Update timer on 10th second, assume not a game state change
		if (this.game.timer % 10 === 0 && this.game.timer !== 0) {
			this.emitTimeUpdate();
		}

		// Do game transitions if timer === 0
		if (this.game.timer > 0) return;

		if (this.game.status === 'PREGAME') {
			this.activate();
		} else if (this.game.status === 'INGAME') {
			this.endGame();
		}
	}

	emitTimeUpdate() {
		this.emit('timerUpdate', this.game.timer);
	}

	activate() {
		this.game.status = 'INGAME';
		this.game.timer = DEFAULTS.GAME_LENGTH;
		this.emit('start');
	}

	endGame() {
		this.game.status = 'ENDED';

		if (this.timerUpdate) {
			clearInterval(this.timerUpdate);
		}

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

	detectiveUseReveal(detectiveId: number, targetId: number) {
		// Detective and target must be valid players
		const detective = this.getPlayer(detectiveId);
		const target = this.getPlayer(targetId);

		if (detective === null) {
			throw new Error('Specified detective is not in this game');
		}

		if (target === null) {
			throw new Error('Specified target is not in this game');
		}

		// Detective must be alive
		if (!detective.alive) {
			throw new Error('Detective is not alive');
		}

		// Target must be alive
		if (!target.alive) {
			throw new Error('Target must be alive');
		}

		// Detective must have a reveal remaining
		if (!detective.reveals || detective.reveals === 0) {
			throw new Error('Detective has no reveals remaining.');
		}
	}
}
