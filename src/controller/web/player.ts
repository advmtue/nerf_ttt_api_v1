// Modules
import { Request, Response, Router } from 'express';

// Libs
import { db } from '../../lib/db';

/**
 * HTTP endpoint for retrieving a full public player listing
 *
 * @param request Express request object
 * @param response Express response object
 */
async function getPlayerList(request: Request, response: Response): Promise<void> {
	const playerList = await db.getPlayerList();
	response.send(playerList);
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
		const player = await db.getPlayerProfile(numberId);
		response.send(player);
	} catch {
		response.send([]);
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
