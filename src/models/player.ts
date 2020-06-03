/**
 * Basic player information
 */
export interface Player {
	id: number;
	name: string;
	banned: boolean;
	join_date: string;
	groups: Group[];
	permissions: Permission[];

	// Fill password_reset if the correct auth is passed
	password_reset?: boolean;
}

/**
 * A permission
 */
export interface Permission {
	name: string;
	description: string;
}

/**
 * Individual group object
 */
export interface Group {
	name: string;
	colour: string;
	emoji: string;
	level: number;
	description: string;
}

/**
 * Stats object for player profile
 */
export interface PlayerStats {
	kills: number;
	deaths: number;
	wins: number;
	losses: number;
	played: number
}

/**
 * Extended profile
 */
export interface PlayerProfile extends Player{
	stats: PlayerStats;
}

/**
 * Login pack
 */
export interface PlayerLogin {
	token: string;
	player: Player;
}
