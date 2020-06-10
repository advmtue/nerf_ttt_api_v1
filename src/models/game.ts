import { Player } from './player';
import * as Role from './gamerole';
import * as Status from './gamestatus';

export interface GameConfig {
}

// Minimal requirements for lobbyList
export interface GameLobby {
	// Game ID
	id: number;

	// Owner
	owner: Player;

	// Name of game
	name: string;

	// Date created
	date_created: Date;

	// Number of players
	player_count: number;
}

// A player within a game
export interface GamePlayer extends Player {
	// Assigned role
	role: Role.Any;

	// Alive status
	alive: boolean;

	// Lobby readyup
	ready: boolean;
}

// Fulll game information
export interface Game {
	// Game ID
	id: number;

	// First initialized
	date_created: Date;

	// Date of status = PREGAME
	date_launched: Date | null;

	// Date of status = ENDED
	date_ended: Date | null;

	// Config
	config: GameConfig | null;

	// Game status
	status: Status.Any;

	// Owner of lobby
	owner: Player;

	// Players
	players: GamePlayer[];

	// Game name
	name: string;
}
