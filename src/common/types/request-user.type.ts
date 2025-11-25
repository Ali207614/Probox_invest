import { Request } from 'express';

export interface UserRequest extends Request {
  user?: {
    id: string;
    phone_number: string;
    role: string;
    [key: string]: unknown;
  };
}
