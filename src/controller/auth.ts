import {Request, Response, Router} from 'express';
import * as jwt from 'jsonwebtoken';
import {Controller} from './_controller';
import {hashPassword} from '../lib/crypto';
import {jwtConfig} from '../config';

import {Player} from '../../models/player';
import {LoginForm, ChangePasswordForm} from '../../models/auth';

export class AuthController extends Controller {
	applyRoutes(router: Router): void {
		router.post('/login', this.playerPostLogin);
		router.post('/passwordreset', [this.checkAuth, this.playerChangePassword]);
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
		const jwtInfo = jwt.verify(
			request.headers.authorization,
			jwtConfig.secret
		) as {id: number};

		// Hash the new password
		const curpwHash = await hashPassword(changePasswordInfo.currentPassword);
		const pwHash = await hashPassword(changePasswordInfo.newPassword);
		console.log(pwHash);

		const responsePayload = {
			success: false
		};

		const updateQuery = await this.api.postgresClient.query(
			'UPDATE "player" SET "password_reset" = false, "password" = $1 WHERE "id" = $2 AND "password" = $3',
			[pwHash, jwtInfo.id, curpwHash]
		);

		// Current password matched, and a row was updated
		if (updateQuery.rowCount === 1) {
			responsePayload.success = true;
		}

		response.send(responsePayload);
	};

	/* Player attempts to login */
	playerPostLogin = async (request: Request, response: Response): Promise<void> => {
		console.log('POST /login');
		const loginInfo: LoginForm = request.body;

		// Hash the user password
		const hashpwd = await hashPassword(loginInfo.password);

		// Retrieve player listing
		const playerQuery = await this.api.postgresClient.query(
			'SELECT "id", "password_reset" FROM "player" WHERE "username"=$1 and "password"=$2;',
			[loginInfo.username, hashpwd]
		);

		const players: Player[] = playerQuery.rows;

		const authInfo = {
			success: false,
			token: '',
			passwordReset: false
		};

		if (players.length === 1) {
			const payload = {
				id: players[0].id
			};

			authInfo.token = jwt.sign(
				payload,
				jwtConfig.secret,
				jwtConfig.options
			);

			authInfo.success = true;
			authInfo.passwordReset = players[0].password_reset;
		}

		response.send(authInfo);
	};

	/* Middleware that only allows for authenticated users to view a path */
	checkAuth = async (request: Request, response: Response, next: any): Promise<void> => {
		if (request.headers.authorization) {
			try {
				jwt.verify(request.headers.authorization, jwtConfig.secret);
				next();
			} catch {
				response.status(403);
			}
		}
	};

}
