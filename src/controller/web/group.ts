import { Request, Response, Router } from 'express';
import * as db from '../database';
import * as apiResponse from '../../lib/apiresponse';

/**
 * Retrieve the permission set for a given group
 *
 * @param request Express request object
 * @param response Express response object
 */
async function getGroupPermissions(request: Request, response: Response): Promise<void> {
	const { groupId } = request.params;
	const permissions = await db.group.getPermissions(groupId);
	response.send(apiResponse.success(permissions));
}

/**
 * Apply group specific routes to an express router
 *
 * @param router The router to modify
 */
export function applyRoutes(router: Router): void {
	router.get('/group/:groupId/permissions', getGroupPermissions);
}
export default applyRoutes;
