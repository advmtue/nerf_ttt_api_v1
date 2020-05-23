import {Request} from 'express';
import {Player} from './player';

export interface PlayerRequest extends Request {
	player?: Player;
}
