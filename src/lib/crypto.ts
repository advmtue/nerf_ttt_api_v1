import { pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { cryptoConfig } from '../config';

// Promisify pbkdf2 (makes the code cleaner below)
const pbkdf2Promise = promisify(pbkdf2);

let salt = '';

/**
 * Allow external modules to set the salt
 * @param newSalt New Salt
 */
export function setSalt(newSalt: string) {
	salt = newSalt;
}

/**
 * Hash a user password using config file
 *
 * @param password Plaintext player password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
	if (salt === '') {
		throw new Error('Could not find salt.');
	}

	const key = await pbkdf2Promise(
		password,
		salt,
		cryptoConfig.iterations,
		cryptoConfig.keylen,
		cryptoConfig.digest,
	);

	return key.toString('hex');
}
export default hashPassword;
