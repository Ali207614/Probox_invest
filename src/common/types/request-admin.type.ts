import { Request } from 'express';

export interface AdminJwtPayload {
  id: string;
  phone_number: string;
  roles: string[];
}

export interface AdminRequest extends Request {
  admin?: AdminJwtPayload;
  user?: AdminJwtPayload;
}
