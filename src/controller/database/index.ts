// Connection
import { Client } from 'pg';
import { EventEmitter } from 'events';

// Connection config
import { postgresConfig } from '../../config';

// Controllers
import { DBPlayerController } from './player';
import { DBGameController } from './game';

import { logger } from '../../lib/logger';

/**
 * Database access controller.
 */
export class Database extends EventEmitter {
	protected connection: Client;

	public player: DBPlayerController;
	public game: DBGameController;

	private salt$: string | undefined;
	private jwtSecret$: string | undefined;

	constructor() {
		super();

		this.connection = new Client(postgresConfig);

		// Create controllers
		this.game = new DBGameController(this, this.connection);
		this.player = new DBPlayerController(this, this.connection);

		// Subscribe to events?
	}

	/**
	 * Attempt to cojnnect and pull/generate secrets.
	 * Any failure here should be considered fatal
	 */
	async connect() {
		logger.info('Connecting PGSQL Client');
		await this.connection.connect();

		logger.info('Setting search path');
		await this.connection.query('SET search_path TO main');

		logger.info('Pulling secrets');
		const q = await this.connection.query(
			'SELECT jwt_secret, hash_salt FROM config ORDER BY id DESC'
		);

		if (q.rowCount === 0) {
			throw new Error('Unable to retrieve secrets.');
		}

		// Assign
		this.salt$ = q.rows[0].hash_salt;
		this.jwtSecret$ = q.rows[0].jwt_secret;

		logger.info('Database ready.');
	}

	/**
	 * Check if there's a salt stored.
	 * Throw an error if there isn't any.
	 */
	get salt(): string {
		if (!this.salt$) {
			throw new Error('No salt found.');
		}
		return this.salt$;
	}

	/**
	 * Check if theres jwtSecrets stored.
	 * Throw an error if there isn't any
	 */
	get jwtSecret(): string {
		if (!this.jwtSecret$) {
			throw new Error('No secrets found.');
		}

		return this.jwtSecret$;
	}
}
