import { Request } from 'express';
import { UserPayload } from '../interfaces/user-payload.interface';

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}
