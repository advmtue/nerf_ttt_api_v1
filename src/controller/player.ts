import {Request, Response, Router} from 'express';
import {Controller} from './_controller';

export class PlayerController extends Controller {
	applyRoutes(router: Router): void {
		router.get('/player', this.getPlayerList);
		router.get('/player/:playerId', this.getPlayerProfile);
	}

	/* Get the list of all players who are registered using the public API */
	getPlayerList = async (request: Request, response: Response): Promise<void> => {
		console.log('Request for player list');
		const player = await this.api.postgresClient.query('SELECT * FROM player_public;');
		response.send(player.rows);
	};

	/* Get the public profile information of a given playerID */
	getPlayerProfile = async (request: Request, response: Response): Promise<void> => {
		const numberId = request.params.playerId;
		const player = await this.api.postgresClient.query('SELECT * FROM player_profile WHERE id = $1;', [numberId]);
		response.send(player.rows[0] || []);
	};
}

