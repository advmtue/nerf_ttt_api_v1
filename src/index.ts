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
	private app: ExpressController;

	private db: Database;

	private gc: GameManager;

	private io: Socket;

	public server: http.Server | undefined;

	constructor(private port: number) {
		logger.info('Starting TTT API server...');

		// ----- DATA LAYER
		this.db = new Database();
		this.gc = new GameManager();

		// ----- ACCESS LAYER
		this.app = new ExpressController(this.gc, this.db);
		this.io = new Socket(this.gc, this.db);
	}

	async start(): Promise<void> {
		// Connect database first
		logger.info('Connecting database');
		await this.db.connect();

		// Enable access layer
		this.server = this.app.listen(this.port);
		this.io.attach(this.server);

		// Done
		logger.info(`Successfully started TTT API server on port ${this.port}`);
	}
}

const api = new TTTAPI(3000);
api.start()
	.then(() => {
		logger.info('Ready to handle connections.');
	})
	.catch((error) => {
		  logger.warn('Server died.')
		  logger.error(error);

		  // Fatal
		  if (api.server) api.server.close();
	});
