/* Default configuration
   Modifying this file has no effect. To change configuration,
   copy this file to src/config.js and modify the clone.
 */

/* PostgreSQL Client Configuration */
export const postgresConfig = {
	user: 'username',
	password: 'password',
	database: 'nerf_ttt',
	port: 5432,
	host: 'somehost.com'
};

/* Cryto Library Config */
export const cryptoConfig = {
	salt: 'somesalt',
	iterations: 100000,
	keylen: 64,
	digest: 'sha1'
};

