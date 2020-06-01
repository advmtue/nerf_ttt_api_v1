/**
 * Common format for response status
 */
interface WebResponseStatus {
	success: boolean;
	code: number;
	msg: string | undefined;
}

/**
 * Type generic web response
 */
export interface WebResponse<T> {
	status: WebResponseStatus;
	data: T;
}
