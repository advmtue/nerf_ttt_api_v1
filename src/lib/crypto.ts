import * as crypto from 'crypto';
import {cryptoConfig} from '../config';

export async function createSessionKey(): Promise<string> {
	return new Promise((resolve, reject) => {
		crypto.randomBytes(cryptoConfig.sessionlen, (error, buf) => {
			if (error) {
				reject(error);
			} else {
				resolve(buf.toString('hex'));
			}
		});
	});
}

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
