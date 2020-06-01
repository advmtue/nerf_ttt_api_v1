/**
 * Response body for login attempts
 */
export interface LoginResponse {
	// Auth JWT
	token: string;
	passwordReset: boolean;
}

export interface PlayerLogin {
	id: number;
	group: string;
	password_reset: boolean;
}
