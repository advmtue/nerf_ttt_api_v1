// Modules
import { Request, Response, Router } from 'express';

// Lib
import * as db from '../database';
import { checkAuth } from '../../lib/auth';
import * as apiResponse from '../../lib/apiresponse';
import * as jwtlib from '../../lib/jwt';
import { logger } from '../../lib/logger';

import { PlayerLogin } from '../../models/player';

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

	// Extract new and current password
	const { newPassword, currentPassword } = request.body;

	if (!newPassword || !currentPassword) {
		// Malformed request
		response.send(apiResponse.httpError(400));
		return;
	}

	// Determine the status of updating the password in the database
	try {
		// Change password
		await db.player.changePassword(request.player, newPassword, currentPassword);

		// The JWT is still valid so don't do anything

		// Send response
		response.send(apiResponse.success());
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.httpError(401));
	}
}

/**
 * HTTP request for a player to login
 *
 * @param request Express request object
 * @param response Express response object
 */
async function playerPostLogin(request: Request, response: Response): Promise<void> {
	// Extract username and password from the request
	const { username, password } = request.body;

	// Ensure the correct parameters have been sent
	if (!username || !password) {
		response.send(apiResponse.httpError(400)); // Malformed request
		return;
	}

	try {
		// Pull a userId for this login
		const player = await db.player.getByLogin(username, password);

		// Create a JWT
		const playerJwt = jwtlib.createToken(player);

		// Send it
		const loginPack: PlayerLogin = {
			token: playerJwt,
			player,
		};
		response.send(apiResponse.success(loginPack));
	} catch (error) {
		logger.error(error);
		// Internal error
		response.send(apiResponse.httpError(500));
	}
}

/**
 * Apply auth specific routes to an express Router
 *
 * @param router Router to apply routes to
 */
export function applyRoutes(router: Router): void {
	router.post('/login', playerPostLogin);
	router.put('/login', [checkAuth, playerChangePassword]);
}
export default applyRoutes;
