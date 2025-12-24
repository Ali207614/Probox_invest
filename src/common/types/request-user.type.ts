import { Request } from 'express';

export interface UserRequest extends Request {
  user?: {
    id: string;
    phone_main: string;
    sap_card_code: string;
    role: string;
    [key: string]: unknown;
  };
}
