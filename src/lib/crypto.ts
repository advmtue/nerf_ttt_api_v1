import * as crypto from 'crypto';
import {cryptoConfig} from '../config';

export async function hashPassword(password: string): Promise<string> {
	return new Promise((resolve, reject) => {
		crypto.pbkdf2(
			password,
			cryptoConfig.salt,
			cryptoConfig.iterations,
			cryptoConfig.keylen,
			cryptoConfig.digest,
			(err, key) => {
				if (err) {
					reject(err);
				} else {
					resolve(key.toString('hex'));
				}
			});
	});
}
