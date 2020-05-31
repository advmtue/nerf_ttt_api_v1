import { Router } from 'express';

// Controllers that define endpoints
import * as playerController from './player';
import * as lobbyController from './lobby';
import * as authController from './auth';
import * as groupController from './group';

/**
 * Create a router, apply controller endpoints and return it
 *
 * @returns A new express router with endpoints specified
 */
export function createRouter(): Router {
	const router = Router();

	playerController.applyRoutes(router);
	lobbyController.applyRoutes(router);
	authController.applyRoutes(router);
	groupController.applyRoutes(router);

	return router;
}
export default createRouter;
