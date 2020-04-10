import {Request, Response, Router} from 'express';
import {Controller} from './_controller';

export class LobbyController extends Controller {
	applyRoutes(router: Router): void {
		router.get('/lobby', this.getLobbyList);
		router.get('/lobby/:lobbyId', this.getLobby);
	}

	/* Get the lobby listing */
	getLobbyList = async (request: Request, response: Response): Promise<void> => {
		const lobbies = await this.api.postgresClient.query('SELECT * FROM lobby_public');
		response.send(lobbies.rows);
	};

	/* Get lobby by ID */
	getLobby = async (request: Request, response: Response): Promise<void> => {
		const lobbyId = request.params.lobbyId;
		const lobby = await this.api.postgresClient.query('SELECT * FROM lobby_public WHERE id = $1', [lobbyId]);
		response.send(lobby.rows);
	};
}

