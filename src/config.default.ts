/* Default configuration
   Modifying this file has no effect. To change configuration,
   copy this file to src/config.js and modify the clone.
 */

/**
  * Postgres Connection information
  */
export const postgresConfig = {
	user: 'username',
	password: 'password',
	database: 'nerf_ttt',
	port: 5432,
	host: 'somehost.com',
};

/**
 * Configuration for hashing passwords
 *
 * You should change the salt (don't lose it!)
 */
export const cryptoConfig = {
	salt: 'somesalt',
	iterations: 100000,
	keylen: 64,
	digest: 'sha1',
};

/**
 * Configuration for signing jwts
 *
 * You should change the secret (don't lose it!)
 */
export const jwtConfig = {
	secret: 'somethingreallylongthatyoushoulddefinitelychange',
	options: {
		expiresIn: '72h',
	},
};
