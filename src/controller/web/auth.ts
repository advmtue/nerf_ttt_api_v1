// Modules
import { Request, Response, Router } from 'express';

// Lib
import { hashPassword } from '../../lib/crypto';
import { db } from '../../lib/db';
import * as jwtlib from '../../lib/jwt';
import { checkAuth } from '../../lib/auth';
import * as apiResponse from '../../lib/apiresponse';

// Interfaces
import { LoginResponse } from '../../models/login';

/**
 * HTTP request for a player to change their password.
 * Player must be authenticated
 *
 * @param request Express request object
 * @param response Express response object
 */
async function playerChangePassword(request: Request, response: Response): Promise<void> {
	// Add header check so typescript doesn't complain
	if (!request.player) {
		response.send(apiResponse.httpError(403));
		return;
	}

	// Interpret the post request as a ChangePasswordForm
	if (!request.body.currentPassword || !request.body.newPassword) {
		response.send(apiResponse.httpError(400));
		return;
	}

	// Extract new and current password
	const { newPassword, currentPassword } = request.body;

	// Extract user variables
	const userId = request.player.id;
	const curpwHash = await hashPassword(currentPassword);
	const pwHash = await hashPassword(newPassword);

	// Determine the status of updating the password in the database
	let success = false;
	success = await db.setPlayerPassword(pwHash, userId, curpwHash);

	if (success) {
		response.send(apiResponse.success());
	} else {
		response.send(apiResponse.httpError(500));
	}
}

/**
 * HTTP request for a player to login
 *
 * @param request Express request object
 * @param response Express response object
 */
async function playerPostLogin(request: Request, response: Response): Promise<void> {
	// Ensure the correct parameters have been sent
	if (!request.body.username || !request.body.password) {
		// Malformed request
		response.send(apiResponse.httpError(400));
		return;
	}

	// Extract username and password from the request
	const { username, password } = request.body;

	// Hash the supplied password
	const hashpwd = await hashPassword(password);

	// Retrieve player listing
	let player: {id: number, group: string, password_reset: boolean } | null;
	try {
		player = await db.getPlayerLogin(username, hashpwd);
	} catch {
		// Couldn't pull the login information (internal error)
		response.send(apiResponse.httpError(500));
		return;
	}

	// Login returned no rows (null user)
	if (player === null) {
		response.send(apiResponse.httpError(401));
		return;
	}

	// Create the login response
	const loginResponse: LoginResponse = {
		token: jwtlib.createToken({ id: player.id, group: player.group }),
		passwordReset: player.password_reset,
	};

	response.send(apiResponse.success<LoginResponse>(loginResponse));
}

/**
 * Apply auth specific routes to an express Router
 *
 * @param router Router to apply routes to
 */
export function applyRoutes(router: Router): void {
	router.post('/login', playerPostLogin);
	router.post('/passwordreset', [checkAuth, playerChangePassword]);
}
export default applyRoutes;
