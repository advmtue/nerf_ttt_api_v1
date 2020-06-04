import { Player } from './player';

export interface GameConfig {
	priest: boolean;
	madman: boolean;
}

export interface GamePlayer extends Player {
	role: string;
	alive: boolean;
}

export interface Game {
	// Game ID
	id: number;

	// Corresponding lobby id
	lobby_id: number;

	// Time remaining
	seconds_left: number;

	// Round number
	round_number: number;

	// Config
	config: GameConfig | null;

	// Game status
	status: string;

	// Owner of lobby
	owner_id: number;

	// Players
	players: GamePlayer[];
}
