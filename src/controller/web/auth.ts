import {Request, Response, Router} from 'express';
import * as jwtlib from '../../lib/jwt';
import {Controller} from './_controller';
import {hashPassword} from '../../lib/crypto';
import {db} from '../../lib/db';

import {LoginForm, ChangePasswordForm} from '../../../models/auth';

export class AuthController extends Controller {
	applyRoutes(router: Router): void {
		router.post('/login', this.playerPostLogin);
		router.post('/passwordreset', [checkAuth, this.playerChangePassword]);
	}

	playerChangePassword = async (request: Request, response: Response): Promise<void> => {
		console.log('POST /passwordreset');

		// Add header check so typescript doesn't complain
		if (!request.headers.authorization) {
			response.status(403);
			return;
		}

		const changePasswordInfo: ChangePasswordForm = request.body;

		// Get userId from jwt
		const jwtInfo = jwtlib.decode(request.headers.authorization) as {id: number};

		// Hash the new password
		const curpwHash = await hashPassword(changePasswordInfo.currentPassword);
		const pwHash = await hashPassword(changePasswordInfo.newPassword);
		console.log(pwHash);

		const responsePayload = {
			success: false
		};

		const pwUpdateStatus = await db.setPlayerPassword(pwHash, jwtInfo.id, curpwHash);

		// Current password matched, and a row was updated
		responsePayload.success = pwUpdateStatus;

		response.send(responsePayload);
	};

	/* Player attempts to login */
	playerPostLogin = async (request: Request, response: Response): Promise<void> => {
		console.log('POST /login');
		const loginInfo: LoginForm = request.body;

		// Hash the user password
		const hashpwd = await hashPassword(loginInfo.password);

		// Retrieve player listing
		const players = await db.getPlayerLogin(loginInfo.username, hashpwd);

		const authInfo = {
			success: false,
			token: '',
			passwordReset: false
		};

		if (players.length === 1) {
			const payload = {
				id: players[0].id,
				group: players[0].group
			};

			authInfo.token = jwtlib.createToken(payload);

			authInfo.success = true;
			authInfo.passwordReset = players[0].password_reset;
		}

		response.send(authInfo);
	};
}

/* Middleware that only allows for authenticated users to view a path */
export const checkAuth = async (request: Request, response: Response, next: any): Promise<void> => {
	if (request.headers.authorization) {
		try {
			jwtlib.decode(request.headers.authorization);
			next();
			return;
		} catch {
			console.log('Auth middleware failed authorization check');
			response.send(403);
		}
	}
	response.send(403);
};
