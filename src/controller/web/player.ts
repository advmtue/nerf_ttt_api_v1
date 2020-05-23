import {Request, Response, Router} from 'express';
import {Controller} from './_controller';
import {db} from '../../lib/db';

export class PlayerController extends Controller {
	applyRoutes(router: Router): void {
		router.get('/player', this.getPlayerList);
		router.get('/player/:playerId', this.getPlayerProfile);
	}

	/* Get the list of all players who are registered using the public API */
	getPlayerList = async (request: Request, response: Response): Promise<void> => {
		const playerList = await db.getPlayerList();
		response.send(playerList);
	};

	/* Get the public profile information of a given playerID */
	getPlayerProfile = async (request: Request, response: Response): Promise<void> => {
		const numberId = request.params.playerId;

		try {
			const player = await db.getPlayerProfile(numberId);
			response.send(player);
		} catch {
			response.send([]);
		}
	};
}

