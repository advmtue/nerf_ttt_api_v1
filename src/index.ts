// Modules
import * as express from 'express';
import * as cors from 'cors';
import * as http from 'http';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';

// Controllers
import { createRouter } from './controller/web';

// Libs
import { db } from './lib/db';
import * as iolib from './lib/io';

/**
 * TTTAPI main server instance. Houses express application and http server.
 *
 * Applies socket and web routing handlers.
 * Calls connect/init methods for db and io respectively.
 */
export class TTTAPI {
	app: express.Application;

	port: number;

	server: http.Server | undefined;

	constructor(port: number) {
		console.log('Starting TTT API server...');
		this.app = express();
		this.port = port;
		this.server = http.createServer(this.app);
	}

	async start(): Promise<void> {
		// Setup middlewares
		this.app.use(cors());
		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({ extended: false }));
		this.app.use(cookieParser());

		// Connect database
		await db.connect();

		// Apply HTTP routes
		this.app.use(createRouter());
		console.log('Applied Routes');

		// Start a http server
		this.server = this.app.listen(this.port);

		// Attach IO to the server (applying routes)
		iolib.init(this.server);

		// Done
		console.log(`Successfully started TTT API server on port ${this.port}`);
	}
}
export default TTTAPI;

new TTTAPI(3000).start().then(() => {
	console.log('Ready to handle connections.');
});
