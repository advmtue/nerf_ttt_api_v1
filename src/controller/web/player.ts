// Modules
import { Request, Response, Router } from 'express';

// Libs
import * as db from '../database';
import { logger } from '../../lib/logger';
import * as apiResponse from '../../lib/apiresponse';
import { checkAuth } from '../../lib/auth';

/**
 * HTTP endpoint for retrieving a full public player listing
 *
 * @param request Express request object
 * @param response Express response object
 */
async function getPlayerList(request: Request, response: Response): Promise<void> {
	try {
		response.send(apiResponse.success(await db.player.getList()));
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.httpError(500));
	}
}

async function getSelf(request:	Request, response: Response) {
	if (!request.player) {
		response.send(apiResponse.httpError(403));
		return;
	}

	response.send(apiResponse.success(request.player));
}

/**
 * HTTP endoint for retrieving a player's public profile
 *
 * @param request Express request object
 * @param response Express response
 */
async function getPlayerProfile(request: Request, response: Response): Promise<void> {
	const playerId = Number(request.params.playerId);

	try {
		response.send(apiResponse.success(await db.player.get(playerId)));
	} catch {
		response.send(apiResponse.httpError(500));
	}
}

/**
 * Apply player specific routes to a given router
 *
 * @param router Express router
 */
export function applyRoutes(router: Router): void {
	router.get('/player', getPlayerList);
	router.get('/player/self', [checkAuth, getSelf]);
	router.get('/player/:playerId', getPlayerProfile);
}
export default applyRoutes;
