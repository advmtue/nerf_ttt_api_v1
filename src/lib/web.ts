import { Request } from 'express';
import { decode } from './jwt';
import { PlayerProfile } from '../../models/player';
import { db } from './db';

export async function requestGetPlayer(request: Request): Promise<PlayerProfile | null> {
	// Ensure that auth tokens have actually been passed
	if (!request.headers.authorization) {
		return null;
	}

	// Try to decode the auth token
	let userInfo: {id: number | undefined} = {id: undefined};
	try {
		userInfo = decode(request.headers.authorization) as {id: number};
	} catch (err) {
		console.log('Error decoding user auth token');
		console.log(err);
		return null;
	}

	// Ensure that is is a valid key on the token
	if (userInfo.id === undefined) {
		console.log('No key attached to user id');
		return null;
	}

	// Pull player profile
	let player: PlayerProfile;
	try {
		player = await db.getPlayerProfile(userInfo.id);
	} catch (err) {
		console.log(err);
		return null;
	}

	return player;
}
