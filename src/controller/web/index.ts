// Modules
import * as express from 'express';
import * as cors from 'cors';
import * as http from 'http';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';

// Controllers
import { GameManager } from '../game';
import { Database } from '../database';

// Lib
import { logger } from '../../lib/logger';

import { ExpressGameMiddleware } from './game';
import { ExpressAuthMiddleware } from './auth';
import { ExpressPlayerMiddleware } from './player';

// Express controller creates an express app.
// It also applies middlewares (instantiated)
export class ExpressController {
	private app: express.Application;

	public player: ExpressPlayerMiddleware;
	public game: ExpressGameMiddleware;
	public auth: ExpressAuthMiddleware;

	constructor(
		private gc: GameManager,
		private db: Database
	) {
		this.app = express();

		logger.info('Establishing middlewares from modules');
		this.app.use(cors());
		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({ extended: false }));
		this.app.use(cookieParser());

		logger.info('Instantiating local middlewares');

		// Add middlewares
		this.auth = new ExpressAuthMiddleware(this, this.app, this.gc, this.db);
		this.player = new ExpressPlayerMiddleware(this, this.app, this.gc, this.db);
		this.game = new ExpressGameMiddleware(this, this.app, this.gc, this.db);
	}

	listen(port: number): http.Server {
		return this.app.listen(port);
	}

}
