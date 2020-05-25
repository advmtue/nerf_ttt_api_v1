import {Request, Response, Router} from 'express';
import {Controller} from './_controller';

// Lib
import {hashPassword} from '../../lib/crypto';
import {db} from '../../lib/db';
import * as jwtlib from '../../lib/jwt';

// Model
import {LoginForm, ChangePasswordForm} from '../../models/auth';
import {PlayerLogin} from '../../models/player';
import {UserInfoJwt} from '../../models/jwt';

export class AuthController extends Controller {
	applyRoutes(router: Router): void {
		router.post('/login', this.playerPostLogin);
		router.post('/passwordreset', [checkAuth, this.playerChangePassword]);
	}

	playerChangePassword = async (request: Request, response: Response): Promise<void> => {
		// Add header check so typescript doesn't complain
		if (!request.headers.authorization) {
			response.status(403);
			return;
		}

		const changePasswordInfo: ChangePasswordForm = request.body;

		// Get userId from jwt
		const jwtInfo = jwtlib.decode(request.headers.authorization);

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
		const loginInfo: LoginForm = request.body;

		// Hash the user password
		const hashpwd = await hashPassword(loginInfo.password);

		// Setup the payload for returning to the user
		const authInfo = {
			success: false,
			token: '',
			passwordReset: false
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
			group: player.group
		};

		// Assign values
		authInfo.token = jwtlib.createToken(payload);
		authInfo.success = true;
		authInfo.passwordReset = player.password_reset;

		response.send(authInfo);
	};
}

/* Middleware that only allows for authenticated users to view a path */
export const checkAuth = async (request: Request, response: Response, next: any): Promise<void> => {
	// Ensure auth headers have actually been sent
	if (!request.headers.authorization) {
		response.send(403);
		return;
	}

	// Assign the userJwt to the request
	let userJwt;
	try {
		userJwt = jwtlib.decode(request.headers.authorization);
		request.userJwt = userJwt;
	} catch {
		console.log('Auth middleware failed authorization check');
		response.send(403);
		return;
	}

	// Assign the player to the request
	try {
		request.player = await db.getPlayerProfile(userJwt.id);
	} catch {
		console.log('Auth middleware failed to pull player profile');
		response.send(403);
		return;
	}

	next();
};