// Modules
import { Client } from 'pg';
import { randomBytes } from 'crypto';
import { promisify } from 'util';

// Libs
import * as cryptolib from '../../lib/crypto';
import * as jwtlib from '../../lib/jwt';
import { logger } from '../../lib/logger';

// Postgres connnection config
import { postgresConfig } from '../../config';

// Turn randomBytes into promise version
const randomBytesAsync = promisify(randomBytes);

// Module global connection
export const connection = new Client(postgresConfig);
let hashSalt: string | undefined;
let jwtSecret: string | undefined;

/**
 * Generate new secrets and persist them in the database
 */
async function generateSecrets() {
	// 64-length salt
	hashSalt = (await randomBytesAsync(32)).toString('hex');
	cryptolib.setSalt(hashSalt);

	// 64-length jwt_secret
	jwtSecret = (await randomBytesAsync(32)).toString('hex');
	jwtlib.setSecret(jwtSecret);

	await connection.query(
		'INSERT INTO "config" (jwt_secret, hash_salt) VALUES ($1, $2)',
		[jwtSecret, hashSalt],
	);

	logger.info('Inserted fresh jwt_secret and hash_salt into db');
}

/**
 * Reset all passwords to default and enable password_reset
 */
async function invalidatePasswords() {
	const defaultHash = await cryptolib.hashPassword('default');

	await connection.query(
		'UPDATE player SET password = $1, password_reset = true',
		[defaultHash],
	);

	logger.info('Invalidated all user passwords');
}

/**
 * Pull secrets from the database
 */
async function pullSecrets() {
	const q = await connection.query('SELECT hash_salt, jwt_secret FROM config');

	if (q.rowCount === 0) {
		// They don't exist, generate them
		await generateSecrets();
		await invalidatePasswords();
	} else {
		hashSalt = q.rows[0].hash_salt;
		jwtSecret = q.rows[0].jwt_secret;
	}
}

/**
 * Connect the database, and set the search path
 */
export async function connect() {
	await connection.connect();
	await connection.query('SET search_path TO main');

	// Pull hash_salt and jwt_secret
	await pullSecrets();

	if (jwtSecret && hashSalt) {
		jwtlib.setSecret(jwtSecret);
		cryptolib.setSalt(hashSalt);
	}
}
