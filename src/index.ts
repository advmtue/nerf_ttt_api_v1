import * as express from 'express';
import {Application} from 'express';
import * as cors from 'cors';
import * as io from 'socket.io';
import {Server} from 'http';
import {Routes} from './controller/web';
import {applySocketRoutes} from './controller/socket';
import {db} from './lib/db';
import * as http from 'http';

import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';

export class TTTAPI {
	app: express.Application;
	port: number;
	server: Server | undefined;
	routeManager: Routes;
	io: SocketIO.Server;

	constructor(port: number) {
		this.app = express();
		this.port = port;
		this.server = http.createServer(this.app);
		this.io = io(this.server);
		this.routeManager = new Routes(this);
	}

	async start(): Promise<void> {
		// Setup middlewares
		this.app.use(cors());
		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({extended: false}));
		this.app.use(cookieParser());
		this.routeManager.createRoutes();

		// Connect database
		await db.connect();

		// Apply routes
		this.app.use(this.routeManager.getRouter());
		console.log('Applied Routes');

		// Start express and attach IO to the http server
		this.server = this.app.listen(this.port);
		this.io = io(this.server);
		applySocketRoutes(this.io);

		// Apply IO routes

		console.log('Started Express');
	}
}

console.log('Starting server…');
const api = new TTTAPI(3000);
api.start().then(() => console.log('Ready'));
