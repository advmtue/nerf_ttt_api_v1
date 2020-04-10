import {Request, Response, Router} from 'express';
import {Client} from 'pg';
import {TTTAPI} from './index.js';

export class Routes {
	api: TTTAPI;
	router: Router;

	constructor(api: TTTAPI) {
		this.api = api;
		this.router = Router();
	}

	getRouter(): Router {
		// Player information
		this.router.get('/player', this.getPlayerList);
		this.router.get('/player/:playerId', this.getPlayerProfile);

		// Lobby information
		this.router.get('/lobby', this.getLobbyList);
		this.router.get('/lobby/:lobbyId', this.getLobby);

		return this.router;
	}

	/* Get the list of all players who are registered using the public API */
	getPlayerList = async (request: Request, response: Response) => {
		const player = await this.api.postgresClient.query('SELECT * FROM player_public;');
		response.send(player.rows);
	}

	/* Get the profile information of a given playerID */
	getPlayerProfile = async (request: Request, response: Response) => {
		const numId = request.params.playerId;
		const player = await this.api.postgresClient.query('SELECT * FROM player_public WHERE id = $1;', [numId]);
		response.send(player.rows);
	}

	/* Get the lobby listing */
	getLobbyList = async (request: Request, response: Response) => {
		const lobbies = await this.api.postgresClient.query('SELECT * FROM lobby_public');
		response.send(lobbies.rows);
	}

	/* Get lobby by ID */
	getLobby = async (request: Request, response: Response) => {
		const lobbyId = request.params.lobbyId;
		const lobby = await this.api.postgresClient.query('SELECT * FROM lobby_public WHERE id = $1', [lobbyId]);
		response.send(lobby.rows);
	}
}

