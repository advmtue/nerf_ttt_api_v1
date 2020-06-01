export interface Player {
	id: number;
	first_name: string;
	last_name: string;
	banned: boolean;
	join_date: string;
	group_name: string;
	group_colour: string;
	group_emoji: string;
	group_icon_file: string;
}

export interface PlayerProfile extends Player {
	stats_kills: number;
	stats_deaths: number;
	stats_wins: number;
	stats_losses: number;
	stats_played: number
}
