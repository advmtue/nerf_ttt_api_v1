import { Request, Response, Router } from 'express';

// Lib
import { hashPassword } from '../../lib/crypto';
import { db } from '../../lib/db';
import * as jwtlib from '../../lib/jwt';
import { checkAuth } from '../../lib/web';

// Interfaces
import { LoginForm, ChangePasswordForm } from '../../models/auth';
import { PlayerLogin } from '../../models/player';
import { UserInfoJwt } from '../../models/jwt';

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
		response.sendStatus(403);
		return;
	}

	// Interpret the post request as a ChangePasswordForm
	const changePasswordInfo = request.body as ChangePasswordForm;

	// Extract user variables
	const userId = request.player.id;
	const curpwHash = await hashPassword(changePasswordInfo.currentPassword);
	const pwHash = await hashPassword(changePasswordInfo.newPassword);

	// Construct a response payload
	const responsePayload = {
		success: false,
	};

	// Determine the status of updating the password in the database
	responsePayload.success = await db.setPlayerPassword(pwHash, userId, curpwHash);

	response.send(responsePayload);
}

/**
 * HTTP request for a player to login
 *
 * @param request Express request object
 * @param response Express response object
 */
async function playerPostLogin(request: Request, response: Response): Promise<void> {
	// Interpret the POST body as a LoginForm
	const loginInfo: LoginForm = request.body;

	// Hash the password
	const hashpwd = await hashPassword(loginInfo.password);

	// Setup the payload for returning to the user
	const authInfo = {
		success: false,
		token: '',
		passwordReset: false,
	};

	// Retrieve player listing
	let player: PlayerLogin;
	try {
		player = await db.getPlayerLogin(loginInfo.username, hashpwd);
	} catch {
		// Login failed
		response.send(authInfo);
		return;
	}

	// Payload for encoding inside the jwt
	const payload: UserInfoJwt = {
		id: player.id,
		group: player.group,
	};

	// Assign values
	authInfo.token = jwtlib.createToken(payload);
	authInfo.success = true;
	authInfo.passwordReset = player.password_reset;

	response.send(authInfo);
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
