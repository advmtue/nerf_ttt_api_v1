import { PlayerProfile } from './player';

export interface GameConfig {
	priest: boolean;
	madman: boolean;
}

export interface GameState {
	id: number;
	lobby_id: number;
	seconds_left: number;
	round_number: number;
	config: GameConfig | null;
	status: string;
	detectives: PlayerProfile[];
	owner_id: number;
}

export interface PlayerGameState extends GameState {
	role: 'INNOCENT' | 'TRAITOR' | 'MADMAN' | 'PRIEST' | 'DETECTIVE';
	buddies: PlayerProfile[];
	alive: boolean;
}
