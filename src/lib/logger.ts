import * as winston from 'winston';

/**
 * Create a logger with transports:
 *
 * Console Output
 * File Output => logs/output.log
 */
export const logger = winston.createLogger({
	transports: [
		new winston.transports.Console({ format: winston.format.simple() }),
		new winston.transports.File({ filename: 'logs/output.log' }),
	],
});
export default logger;
