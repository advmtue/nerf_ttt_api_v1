import * as express from 'express';
import {Application} from 'express';
import {Client} from 'pg';
import {postgresConfig} from './config';
import {Server} from 'http';
import {Routes} from './controller';

import * as bodyParser from 'body-parser';

export class TTTAPI {
	app: express.Application;
	postgresClient: Client;
	postgresConfig: any;
	port: number;
	server: Server | undefined;
	routeManager: Routes;

	constructor(port: number) {
		this.app = express();
		this.postgresConfig = postgresConfig;
		this.postgresClient = new Client(postgresConfig);
		this.port = port;
		this.server = undefined;
		this.routeManager = new Routes(this);
	}

	async start(): Promise<void> {
		this.app.use(bodyParser.json());

		// Connect postgres
		await this.connectPostgres();
		console.log('Connected Postgres');

		// Apply routes
		this.app.use(this.routeManager.getRouter());
		console.log('Applied Routes');

		// Start express
		this.server = this.app.listen(this.port);
		console.log('Started Express');
	}

	async connectPostgres(): Promise<void> {
		await this.postgresClient.connect();
		await this.postgresClient.query('SET search_path TO main');
	}
}

console.log('Starting server…');
const api = new TTTAPI(3000);
api.start().then(() => console.log('Ready'));
