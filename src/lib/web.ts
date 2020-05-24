import {Request} from 'express';
import {decode} from './jwt';
import {PlayerProfile} from '../models/player';
import {db} from './db';
import {UserInfoJwt} from '../models/jwt';

export async function requestGetPlayer(request: Request): Promise<PlayerProfile> {
	// Ensure that auth tokens have actually been passed
	if (!request.headers.authorization) {
		throw new Error('Missing auth header');
	}

	// Try to decode the auth token
	let userInfo: UserInfoJwt;
	try {
		userInfo = decode(request.headers.authorization);
	} catch (err) {
		throw new Error('Couldn\'t decode player auth token');
	}

	// Ensure that is is a valid key on the token
	if (userInfo.id === undefined) {
		throw new Error('No key attached to user id');
	}

	// Pull player profile
	let player: PlayerProfile;
	try {
		player = await db.getPlayerProfile(userInfo.id);
	} catch (err) {
		console.log(err);
		throw new Error('Couldn\'t pull player profile from database');
	}

	return player;
}
