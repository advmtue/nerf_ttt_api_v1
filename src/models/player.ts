/**
 * Basic player information
 */
export interface Player {
	id: number;
	name: string;
	emoji: string;
	colour: string;
}

/**
 * Full player profiled. Only pulled very occasionally
 */
export interface PlayerProfile extends Player {
	banned: boolean;
	join_date: string;
	primary_group: string;
	groups: Group[];
	permissions: Permission[];
	stats: PlayerStats;

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
 * Login pack
 */
export interface PlayerLogin {
	token: string;
	player: PlayerProfile;
}
