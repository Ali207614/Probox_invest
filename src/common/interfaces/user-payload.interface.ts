export interface UserPayload {
  id: string;
  sap_card_code: string;
  phone_main: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}
