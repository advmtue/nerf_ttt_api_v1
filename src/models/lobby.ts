/**
 * Entire lobby structure from the database
 */
export interface Lobby {
	id: number;
	owner_id: number;
	name: string;
	date_created: Date;
	lobby_status: string;
	owner_first_name: string;
	owner_last_name: string;
	owner_group: string;
	owner_group_icon_file: string;
	owner_group_colour: string;
	owner_group_emoji: string;
	player_count: number;
}
