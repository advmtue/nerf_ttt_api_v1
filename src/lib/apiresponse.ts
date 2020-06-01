// Modules
import { STATUS_CODES } from 'http';

// Interfaces
import { WebResponse } from '../models/response';

/**
 * Successful response. Sets success = true and assigns a payload
 *
 * @param payload Response body
 */
export function success<T>(payload?: T): WebResponse<T> {
	return {
		status: {
			success: true,
			code: 0,
			msg: '',
		},
		data: payload,
	} as WebResponse<T>;
}

/**
 * Unsuccessful response. Assigns code and msg, and sets data = null
 *
 * @param code Error code
 * @param msg Error msg
 */
export function error(code: number, msg?: string): WebResponse<undefined> {
	return {
		status: {
			success: false,
			code,
			msg,
		},
		data: undefined,
	} as WebResponse<undefined>;
}

/**
 * Unsuccessful response with HTTP specific error code
 * Assigns message to be the translated HTTP status code
 * @param code HTTP Error code (Eg. 404)
 */
export function httpError(code: number): WebResponse<undefined> {
	return {
		status: {
			success: false,
			code,
			msg: STATUS_CODES[code],
		},
		data: undefined,
	} as WebResponse<undefined>;
}
