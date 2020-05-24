import * as jwt from 'jsonwebtoken';
import {jwtConfig} from '../config';
import {UserInfoJwt} from '../models/jwt';

export function createToken(data: UserInfoJwt): string {
	return jwt.sign(
		data,
		jwtConfig.secret,
		jwtConfig.options
	);
}

export function decode(token: string): UserInfoJwt {
	return jwt.verify(
		token,
		jwtConfig.secret
	) as UserInfoJwt;
}
