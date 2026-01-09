import { Request } from 'express';
import { UserPayload } from '../interfaces/user-payload.interface';

export interface UserRequest extends Request {
  user?: UserPayload;
}
