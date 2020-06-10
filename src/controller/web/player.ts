// Modules
import { Application, Request, Response } from 'express';

// Libs
import { logger } from '../../lib/logger';
import * as apiResponse from '../../lib/apiresponse';

// Associated controllers
import { GameManager } from '../game';
import { Database } from '../database';

// Base class
import { ExpressController } from './index';

export class ExpressPlayerMiddleware {

	constructor(
		protected all: ExpressController,
		protected app: Application,
		protected gc: GameManager,
		protected db: Database
	) {
		app.get('/player', this.getPlayerList);
		app.get('/player/:playerId', [this.all.auth.checkAuth, this.getPlayerProfile]);
	}

	/**
	 * HTTP endpoint for retrieving a full public player listing
	 *
	 * @param request Express request object
	 * @param response Express response object
	 */
	getPlayerList = async (request: Request, response: Response): Promise<void> => {
		try {
			response.send(apiResponse.success(await this.db.player.getList()));
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.httpError(500));
		}
	}

	/**
	 * HTTP endoint for retrieving a player's public profile
	 *
	 * @param request Express request object
	 * @param response Express response
	 */
	getPlayerProfile = async (request: Request, response: Response): Promise<void> => {
		const playerId = Number(request.params.playerId);

		// Malformed request
		if (!playerId) {
			response.send(apiResponse.httpError(401));
			return;
		}


		// Pull the profile
		try {
			// Sets showReset if calling player and requested IDs match
			const profile = await this.db.player.getProfile(playerId, request.player.id === playerId);
			response.send(apiResponse.success(profile));
		} catch (error) {
			logger.error(error);
			response.send(apiResponse.error(error.code, error.message));
		}
	}
}

