// Modules
import * as socketio from 'socket.io';
import * as http from 'http';

// Controllers
import { applySocketRoutes } from '../controller/socket';

// Instantiate a global socket server which can be referenced
export const io = socketio();

/**
 * Attach a http server to the socket server
 *
 * @param server Http server
 */
export function init(server: http.Server): void {
	io.attach(server);

	applySocketRoutes(io);
}
