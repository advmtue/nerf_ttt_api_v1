import {Router} from 'express';
import {TTTAPI} from '..';

// Api endpoints
import {PlayerController} from './player';
import {LobbyController} from './lobby';

export class Routes {
	api: TTTAPI;
	router: Router;
	playerController: PlayerController;
	lobbyController: LobbyController;

	constructor(api: TTTAPI) {
		this.api = api;

		// Disable linting for the next line, since it's an expressjs problem
		// eslint-disable-next-line new-cap
		this.router = Router();

		this.playerController = new PlayerController(api);
		this.lobbyController = new LobbyController(api);
		this.createRoutes();
	}

	createRoutes(): void {
		this.playerController.applyRoutes(this.router);
		this.lobbyController.applyRoutes(this.router);
	}

	getRouter(): Router {
		return this.router;
	}
}

