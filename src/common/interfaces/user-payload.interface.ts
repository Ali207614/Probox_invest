export interface UserPayload {
  id: string;
  phone_main: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}
