import * as jwt from 'jsonwebtoken';
import {jwtConfig} from '../config';

export function createToken(data: any) {
	return jwt.sign(
		data,
		jwtConfig.secret,
		jwtConfig.options
	);
}

export function decode(token: any) {
	return jwt.verify(
		token,
		jwtConfig.secret
	)
}
