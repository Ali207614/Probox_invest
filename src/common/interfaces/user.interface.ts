export interface IUser {
  id: string;
  first_name: string;
  last_name: string;
  phone_main: string;
  phone_secondary: string | null;
  username?: string | null;
  sap_card_code?: string | null;
  sap_card_name?: string | null;
  phone_verified: boolean;
  password?: string | null;
  status: 'Open' | 'Deleted' | 'Pending' | 'Banned';
  created_at: string;
  updated_at: string | null;
}
