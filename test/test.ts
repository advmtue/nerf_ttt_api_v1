import 'mocha';
import * as assert from 'assert';

const hello = () => 'hello';

describe('A test', () => {
	describe('A subtest', () => {
		it('should return hello', () => {
			assert.equal(hello(), 'hello');
		});
	});
});
