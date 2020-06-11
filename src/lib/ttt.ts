import * as pgpromise from 'pg-promise';

/**
 * Build a query to insert roles for a game into the database
 *
 * @todo Change structures to use param Game instead if possible.
 *
 * @param gameId Game ID
 * @param roles {id: Player ID, role: Game Role}[]
 *
 * @returns roleQuery Parameterized query to push all players to a game
 */
export function buildRolesQuery(gameId: number, roles: {id: number, role: string}[]) {
	let qs = 'INSERT INTO game_player (game_id, player_id, role, alive) VALUES ';
	let first = true;

	roles.forEach((pl) => {
		const a = pgpromise.as.format(
			'($1, $2, $3, TRUE)',
			[gameId, pl.id, pl.role],
		);
		if (first) {
			qs = `${qs} ${a}`;
			first = false;
		} else {
			qs = `${qs}, ${a}`;
		}
	});

	return qs;
}
