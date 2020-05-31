import { pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { cryptoConfig } from '../config';

// Promisify pbkdf2 (makes the code cleaner below)
const pbkdf2Promise = promisify(pbkdf2);

/**
 * Hash a user password using config file
 *
 * @param password Plaintext player password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
	const key = await pbkdf2Promise(
		password,
		cryptoConfig.salt,
		cryptoConfig.iterations,
		cryptoConfig.keylen,
		cryptoConfig.digest,
	);

	return key.toString('hex');
}
export default hashPassword;
