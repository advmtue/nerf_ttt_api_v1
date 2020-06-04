// Modules
import { Request, Response } from 'express';

// Libs
import * as db from '../controller/database';
import { logger } from './logger';
import * as jwtlib from './jwt';
import * as apiResponse from './apiresponse';

/**
 * Express middleware which restricts only authenticated users to view a path
 *
 * @param request Express request
 * @param response Express response
 * @param next Express next
 */
export async function checkAuth(request: Request, response: Response, next: any) {
	// Ensure auth headers have actually been sent
	if (!request.headers.authorization) {
		response.send(apiResponse.httpError(403));
		return;
	}

	// Decode the passed auth token into a UserInfoJwt
	let playerId;
	try {
		playerId = jwtlib.decodeId(request.headers.authorization);
	} catch (error) {
		logger.error(error);
		response.send(apiResponse.httpError(403));
		return;
	}

	// Pull a user and assign it to the request context
	try {
		request.player = await db.player.get(playerId);
		next();
	} catch (error) {
		// Failed to pull user
		logger.error(error);
		response.sendStatus(403);
	}
}
export default checkAuth;
