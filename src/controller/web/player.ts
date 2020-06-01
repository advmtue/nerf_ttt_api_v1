// Modules
import { Request, Response, Router } from 'express';

// Libs
import { db } from '../../lib/db';
import { logger } from '../../lib/logger';
import * as apiResponse from '../../lib/apiresponse';

/**
 * HTTP endpoint for retrieving a full public player listing
 *
 * @param request Express request object
 * @param response Express response object
 */
async function getPlayerList(request: Request, response: Response): Promise<void> {
	try {
		response.send(apiResponse.success(await db.getPlayerList()));
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
async function getPlayerProfile(request: Request, response: Response): Promise<void> {
	const numberId = request.params.playerId;

	try {
		response.send(apiResponse.success(await db.getPlayerProfile(numberId)));
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
	router.get('/player/:playerId', getPlayerProfile);
}
export default applyRoutes;
