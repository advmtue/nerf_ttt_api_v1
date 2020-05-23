export interface Player {
	id: number;
	password_reset: boolean;
	group: string;
}

export interface PlayerProfile {
	id: number;
	first_name: string,
	last_name: string,
	banned: boolean,
	group_name: string;
	group_colour: string;
	group_emoji: string;
}

