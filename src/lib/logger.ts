/* eslint-disable no-console */
import * as chalk from 'chalk';

// Colours for each log level
const levelColours = {
	error: chalk.red,
	warn: chalk.yellow,
	info: chalk.green,
};

// Prefix for each log level
const prefix = {
	error: 'Error: ',
	warn: 'Warning: ',
	info: 'Info: ',
};

/**
 * Handle a type of log and print it to console
 *
 * @param logType Type of log (error | warn | info)
 * @param info Simple information string or an object
 * @param extra Extra information object
 */
function handle(logType: 'error' | 'warn' | 'info', info: any, extra?: any) {
	const colorizer = levelColours[logType];
	const pref = prefix[logType];

	let printEnd = false;

	if (typeof info === 'string') {
		// Basic one-liner
		console.log(colorizer(pref), info);
	} else {
		// Print prefix on first line and output on second
		console.log(colorizer(pref));
		console.log(info);
		printEnd = true;
	}

	if (extra) {
		console.log(extra);
		printEnd = true;
	}

	if (printEnd) {
		console.log(colorizer('-----'));
	}
}

/**
 * Export the logger with different handlers
 */
export const logger = {
	error: (error: Error) => handle('error', error),
	info: (info: any, extra?: any) => handle('info', info, extra),
	warn: (info: any, extra?: any) => handle('warn', info, extra),
};

export default logger;
