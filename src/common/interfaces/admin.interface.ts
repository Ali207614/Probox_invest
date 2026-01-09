export interface Admin {
  id?: string;
  first_name?: string;
  last_name?: string;
  phone_main: string;
  phone_secondary?: string;
  phone_verified?: boolean;
  verification_code?: string;
  password?: string;
  is_protected?: boolean;
  sap_card_code?: string;
  sap_card_name?: string;
  passport_series?: string;
  birth_date?: Date | string;
  id_card_number?: string;
  language?: string;
  is_active?: boolean;
  status?: 'Pending' | 'Open' | 'Deleted' | 'Banned';
  profile_picture?: string;
  device_token: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}
