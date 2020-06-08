import { Player } from './player';
import * as Role from './role';

export interface GameConfig {
}

export interface GamePlayer extends Player {
	role: Role.Any;
	alive: boolean;
}

export interface Game {
	// Game ID
	id: number;

	// Corresponding lobby id
	lobby_id: number;

	// Time remaining
	next_time: Date;

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
