import {Request, Response, Router} from 'express';
import {Controller} from './_controller';
import {db} from '../../lib/db';

export class GroupController extends Controller {
	applyRoutes(router: Router): void {
		router.get('/group/:groupId/permissions', this.getGroupPermissions);
	}

	/* Get the permissions of a given group by groupName */
	getGroupPermissions = async (request: Request, response: Response): Promise<void> => {
		const groupId = request.params.groupId;
		const permissions = await db.getGroupPermissions(groupId);
		response.send(permissions);
	};
}

