// Modules
import * as http from 'http';

// Controllers
import { Database } from './controller/database';
import { GameManager } from './controller/game';
import { Socket } from './controller/socket'
import { ExpressController } from './controller/web';

// Libs
import { logger } from './lib/logger';

/** TODO: Give me some coole information
 */
export class TTTAPI {
	app: ExpressController;

	db: Database;

	gc: GameManager;

	io: Socket;

	server: http.Server;

	constructor(private port: number) {
		logger.info('Starting TTT API server...');

		// ----- DATA LAYER
		// Create database controller as event emitter
		this.db = new Database();

		// Create game controller as event emitter
		this.gc = new GameManager();

		// ----- ACCESS LAYER
		this.app = new ExpressController(this.gc, this.db);
		//		apply controllers

		this.io = new Socket(this.gc, this.db);
		//		apply controllers

		// ----- AGGREGATE
		this.server = this.app.listen(this.port);
		this.io.attach(this.server);
	}

	async start(): Promise<void> {
		// Connect database
		logger.info('Connecting database');
		await this.db.connect();

		// Done
		logger.info(`Successfully started TTT API server on port ${this.port}`);
	}
}

new TTTAPI(3000).start()
	.then(() => {
		logger.info('Ready to handle connections.');
	})
	.catch(logger.error);
