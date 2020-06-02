// Modules
import { Request, Response } from 'express';

// Libs
import * as db from '../controller/database';
import { logger } from './logger';
import * as jwtlib from './jwt';
import * as apiResponse from './apiresponse';

// Interfaces
import { Player } from '../models/player';

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
	let userJwt;
	try {
		userJwt = jwtlib.decode(request.headers.authorization);
	} catch (error) {
		logger.error(error);
		response.sendStatus(403);
		return;
	}

	// Pull a user and assign it to the request context
	let player: Player | null;
	try {
		player = await db.player.get(userJwt.id);
	} catch (error) {
		// Failed to pull user
		logger.error(error);
		response.sendStatus(403);
		return;
	}

	// Assign parts to the request
	if (player !== null) {
		request.player = player;
		request.playerJwt = userJwt;
		next();
	} else {
		response.send(apiResponse.httpError(403));
	}
}
export default checkAuth;
