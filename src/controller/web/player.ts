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

/**
 * HTTP endoint for retrieving a player's public profile
 *
 * @param request Express request object
 * @param response Express response
 */
async function getPlayerProfile(request: Request, response: Response): Promise<void> {
	const playerId = Number(request.params.playerId);

	// Malformed request
	if (!playerId) {
		response.send(apiResponse.httpError(401));
		return;
	}


	// Pull the profile
	try {
		// Sets showReset if calling player and requested IDs match
		const profile = await db.player.getProfile(playerId, request.player.id === playerId);
		response.send(apiResponse.success(profile));
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.error(error.code, error.message));
	}
}

/**
 * Apply player specific routes to a given router
 *
 * @param router Express router
 */
export function applyRoutes(router: Router): void {
	router.get('/player', getPlayerList);
	router.get('/player/:playerId', [checkAuth, getPlayerProfile]);
}
export default applyRoutes;
