// Modules
import * as http from 'http';

// Controllers
// -- Data
import { Database } from './controller/database';
import { GameManager } from './controller/game';
// -- Access
import { Socket } from './controller/socket'
import { ExpressController } from './controller/web';

// Libs
import { logger } from './lib/logger';

/**
 * TTT API main server. Houses all DB, GC, IO and HTTP controllers.
 */
export class TTTAPI {
	private app: ExpressController;

	private db: Database;

	private gc: GameManager;

	private io: Socket;

	public server: http.Server | undefined;

	constructor() {
		logger.info('Starting TTT API server...');

		// ----- DATA LAYER
		this.db = new Database();
		this.gc = new GameManager();

		// ----- ACCESS LAYER
		this.app = new ExpressController(this.gc, this.db);
		this.io = new Socket(this.gc, this.db);
	}

	/**
	 * Connect the database and start listening on defined port
	 * @param port Port number to listen on
	 */
	async start(port: number): Promise<void> {
		// Connect database first
		logger.info('Connecting database');
		await this.db.connect();

		// Enable access layer
		this.server = this.app.listen(port);
		this.io.attach(this.server);

		// Done
		logger.info(`Successfully started TTT API server on port ${port}`);
	}
}

const api = new TTTAPI();
api.start(3000)
	.then(() => {
		// Good to go
		logger.info('Ready to handle connections.');
	})
	.catch((error) => {
		  logger.warn('Server died.')
		  logger.error(error);

		  // Fatal
		  if (api.server) api.server.close();
	});
