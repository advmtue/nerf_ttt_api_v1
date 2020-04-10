import {Request, Response, Router} from 'express';
import {Controller} from './_controller';
import {createSessionKey, hashPassword} from '../lib/crypto';

export class LoginController extends Controller {
	applyRoutes(router: Router): void {
		router.post('/login', this.playerPostLogin);
	}

	/* Player attempts to login */
	playerPostLogin = async (request: Request, response: Response): Promise<void> => {
		const sessId = await createSessionKey();
		const hashpwd = await hashPassword(request.body.password);
		response.send([sessId, hashpwd, request.body]);
	};
}

