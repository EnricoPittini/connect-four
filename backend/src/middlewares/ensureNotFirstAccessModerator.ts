import express from 'express';
import { PlayerType } from '../models/Player';
import {
  ErrorResponseBody,
} from '../httpTypes/responses';

export function ensureNotFirstAccessModerator(req: express.Request, res: express.Response, next: express.NextFunction){
  if (req.user!.type === PlayerType.MODERATOR_FIRST_ACCESS) {
    console.warn('A first access moderator tried to perform an unauthorized operation, user: ' + JSON.stringify(req.user, null, 2));
    const errorBody: ErrorResponseBody = {
      error: true,
      statusCode: 403,
      errorMessage: 'You must confirm your moderator profile first'
    };
    return next(errorBody);
  }
  return next();
}