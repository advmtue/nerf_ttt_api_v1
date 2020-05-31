/**
 * Most basic information for a player
 */
export interface Player {
	id: number;
	group: string;
}

/**
 * Player login response
 */
export interface PlayerLogin extends Player {
	password_reset: boolean;
}

/**
 * Full public player profile
 */
export interface PlayerProfile {
	id: number;
	first_name: string,
	last_name: string,
	banned: boolean,
	group_name: string;
	group_colour: string;
	group_emoji: string;
}
