import { Request } from 'express';
import { AdminJwtPayload } from './request-admin.type';

export interface AdminRequest extends Request {
  admin?: AdminJwtPayload;
}
