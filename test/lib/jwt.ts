import * as assert from 'assert';

import 'mocha';
import * as jwt from 'jsonwebtoken';

import * as jwtlib from '../../src/lib/jwt';
import { jwtConfig } from '../../src/config';
import { Player } from '../../src/models/player';


// Signing secret
const testSecret: string = 'test secret';

// Setup some test player interfaces
const testPlayerTokens: Player[] = [
	{
		id: -1,
		name: 'negative one',
		emoji: '',
		colour: '#333333',
	},
	{
		id: 100,
		name: 'one hundred',
		emoji: '',
		colour: '#000000',
	},
	{
		id: 100,
		name: 'also one hundred',
		emoji: '',
		colour: '#999999',
	},
]


describe('JWT encoding / decoding @ lib/jwt', () => {

	// Decoding tokens should succeed.
	it('encodes and decodes to the same ID', () => {
		// Create some signed tokens
		const testInputs = testPlayerTokens.map(gr => {
			return jwtlib.createToken(gr, testSecret);
		});

		// Try to decode them
		testInputs.forEach((token, idx) => {
			const dec = jwtlib.decodeId(token, testSecret);
			assert.equal(dec, testPlayerTokens[idx].id)
		});
	});


	// Create two tokens from players with the same ID but different bodies
	// Should decode to the same ID
	it('same players with different bodies decode to the same id', () => {
		// Create tokens for P1 and P2 (which are the same player)
		const p1 = jwtlib.createToken(testPlayerTokens[1], testSecret);
		const p2 = jwtlib.createToken(testPlayerTokens[2], testSecret);

		// Decode them
		const p1id = jwtlib.decodeId(p1, testSecret);
		const p2id = jwtlib.decodeId(p2, testSecret);

		assert.equal(p1id, p2id);
	});

	describe('encoding', () => {
		it('throws error if secret is empty', () => {
			assert.throws(() => jwtlib.createToken(testPlayerTokens[0], ''));
		});
	});

	describe('decoding', () => {
		// Pass a garbage jwt and expect an error thrown
		it('throws error for malformed jwt', () => {
			assert.throws(() => jwtlib.decodeId('asdf', testSecret));
		});

		// Pass an empty jwt
		it('throws error for empty jwt', () => {
			assert.throws(() => jwtlib.decodeId('', testSecret));
		});

		// Pass an empty secret
		it('throws error for invalid secret', () => {
			const token = jwtlib.createToken(testPlayerTokens[0], testSecret);
			assert.throws(() => jwtlib.decodeId(token, ''));
		});

		it('throws error if input token has no .id field', () => {
			const badToken = jwt.sign({}, testSecret, jwtConfig.options);
			assert.throws(() => jwtlib.decodeId(badToken, testSecret));
		});
	});
});
