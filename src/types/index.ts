import {PlayerProfile} from '../models/player';
import {UserInfoJwt} from '../models/jwt';

declare module 'express-serve-static-core' {
	interface Request {
		player?: PlayerProfile;
		userJwt?: UserInfoJwt;
	}
}
