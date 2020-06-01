import { PlayerProfile } from './player';

/**
 * Information stored within player jwts
 */
export interface PlayerJwt {
	id: number;
	group: string;
	password_reset: boolean;
}

/**
 * Initial login package when a player auths
 * Saves doing a few round trips
 */
export interface InitialLogin {
	jwt: string;
	profile: PlayerProfile;
	permissions: string[];
}
