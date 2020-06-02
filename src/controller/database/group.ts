import { connection } from './connection';

/**
 * Get the permission array for a given group
 *
 * @param groupId The group to pull permissions for
 */
export async function getPermissions(groupId: string) {
	const permissions = await connection.query(
		'SELECT "permission_name" FROM "group_permission" WHERE "group_name" = $1;',
		[groupId],
	);

	// Extract permission names into a list
	const permissionList: string[] = [];
	permissions.rows.forEach((item: {permission_name: string}) => {
		permissionList.push(item.permission_name);
	});

	return permissionList;
}

/**
 * Check if a group has sufficient permissions to perform a task
 *
 * @param groupId Group Id
 * @param permissionName Name of permission
 */
export async function hasPermission(groupId: string, permissionName: string) {
	const q = await connection.query(
		'SELECT permission_name FROM group_permission WHERE group_name = $1',
		[groupId],
	);

	// Group has permission || group has all permissions
	let has = false;
	q.rows.forEach((row) => {
		if (row.permission_name === 'all' || row.permission_name === permissionName) {
			has = true;
		}
	});

	return has;
}
