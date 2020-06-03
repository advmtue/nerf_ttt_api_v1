import { Player } from './player';

/**
 * Lobby structure for basic viewing
 */
export interface Lobby {
	id: number;
	owner: Player;
	name: string;
	date_created: Date;
	status: string;
	player_count: number;
}

/**
 * Lobby structure for further information
 */
export interface LobbyComplete extends Lobby {
	players: Player[],
	ready_players: number[];
}
