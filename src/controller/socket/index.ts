// Modules
import * as socketio from 'socket.io';
import * as http from 'http';

// Controllers
import { GameManager } from '../game';
import { Database } from '../database';

import { logger } from '../../lib/logger';
import * as jwtlib from '../../lib/jwt';

import { SocketGameOutController, SocketGameInController } from './game';

export class Socket {
	// Database and GC connections
	private io: SocketIO.Server;

	private gameIn: SocketGameInController;

	constructor(
		protected gc: GameManager,
		protected db: Database
	) {
		this.io = socketio();

		this.io.on('connect', (socket) => {
			socket.on('auth', this.onAuth.bind(this, socket));
		});

		// outbound
		new SocketGameOutController(this.io, gc, db);

		// inbound -- Applies routes to authed sockets later
		this.gameIn = new SocketGameInController(this.io, gc, db);

	}

	/**
	 * Add inbound routes to sockets
	 *
	 * @param socket Socket to configure
	 */
	applyAuthedRoutes(socket: SocketIO.Socket) {
		this.gameIn.applyRoutes(socket);
	}

	/**
	 * onAuth
	 * @event socket:auth
	 * @param token Auth JWT
	 */
	async onAuth(socket: SocketIO.Socket, token: string) {
		if (!token) {
			socket.emit('auth', false);
			return;
		}

		// Pull corresponding player and associate with socket
		try {
			const playerId = jwtlib.decodeId(token, this.db.jwtSecret);
			socket.player = await this.db.player.get(playerId);
		} catch (error) {
			logger.error(error);
			socket.emit('auth', false);
			return;
		}

		socket.emit('auth', true);

		// Join user room for any private messages
		socket.join(`player ${socket.player.id}`);
		logger.info(`Associated Socket#${socket.id} with Player#${socket.player.id}`);

		// Make all routes available
		this.applyAuthedRoutes(socket);
	}

	/**
	 * Attach IO to a HTTP server
	 *
	 * @param server HTTP Server to attach
	 */
	attach(server: http.Server) {
		this.io.attach(server);
	}
}
