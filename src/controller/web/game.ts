// Modules
import { Request, Response, Router } from 'express';

// Controller
import * as db from '../database';

// Libs
import { checkAuth } from '../../lib/auth';
import * as apiResponse from '../../lib/apiresponse';
import { logger } from '../../lib/logger';

/**
 * Get game, including player specific game state
 * @param request Express Request
 * @param response Express Response
 */
async function getGame(request: Request, response: Response) {
	if (!request.player) {
		response.send(apiResponse.httpError(403));
		return;
	}

	const gameId = Number(request.params.gameId);
	const playerId = request.player.id;

	try {
		const p = await db.game.playerGameState(gameId, playerId);
		response.send(apiResponse.success(p));
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.error(1, error.message));
	}
}

/**
 * Add game specific routes to a router
 * @param router Router to modify
 */
export function applyRoutes(router: Router) {
	router.get('/game/:gameId', [checkAuth, getGame]);
}
export default applyRoutes;
