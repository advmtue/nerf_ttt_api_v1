import {Request, Response, Router} from 'express';
import * as jwt from 'jsonwebtoken';
import {Controller} from './_controller';
import {hashPassword} from '../lib/crypto';
import {jwtConfig} from '../config';

import {Player} from '../../models/player';
import {LoginForm} from '../../models/auth';

export class AuthController extends Controller {
	applyRoutes(router: Router): void {
		router.post('/login', this.playerPostLogin);
		router.get('/logout', this.playerLogout);
	}

	/* Player attempts to login */
	playerPostLogin = async (request: Request, response: Response): Promise<void> => {
		console.log('POST /login');
		const loginInfo: LoginForm = request.body;

		// Hash the user password
		const hashpwd = await hashPassword(loginInfo.password);

		// Retrieve player listing
		const playerQuery = await this.api.postgresClient.query(
			'SELECT "id" FROM "player" WHERE "username"=$1 and "password"=$2;',
			[loginInfo.username, hashpwd]
		);

		const players: Player[] = playerQuery.rows;

		const authInfo = {
			success: false,
			token: ''
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
		}

		response.send(authInfo);
	};

	/* Log a player out, invalidating session and deleting cookies */
	playerLogout = async (request: Request, response: Response): Promise<void> => {
		response.clearCookie('test');
		response.send(1);
	};
}
