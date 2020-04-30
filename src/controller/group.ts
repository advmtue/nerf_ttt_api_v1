import {Request, Response, Router} from 'express';
import {Controller} from './_controller';

export class GroupController extends Controller {
	applyRoutes(router: Router): void {
		router.get('/group/:groupId/permissions', this.getGroupPermissions);
	}

	/* Get the permissions of a given group by groupName */
	getGroupPermissions = async (request: Request, response: Response): Promise<void> => {
		const groupId = request.params.groupId;
		const permissions = await this.api.postgresClient.query(
			'SELECT "permission_name" FROM "group_permission" WHERE "group_name" = $1;',
			[groupId]
		);

		// Extract permission names into a list
		const permissionList: string[] = [];
		permissions.rows.forEach((item: {permission_name: string}) => permissionList.push(item.permission_name));
		response.send(permissionList);
	};
}

