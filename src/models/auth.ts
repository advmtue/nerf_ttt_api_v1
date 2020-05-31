/**
 * Login form submission
 */
export interface LoginForm {
	username: string;
	password: string;
}

/**
 * Change password form submission
 */
export interface ChangePasswordForm {
	currentPassword: string;
	newPassword: string;
}
