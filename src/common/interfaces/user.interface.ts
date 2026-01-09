import { ImageUrls } from '../../upload/upload.service';

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
  profile_picture: string | null;
  status: 'Open' | 'Deleted' | 'Pending' | 'Banned';
  is_active: boolean;
  language: string;
  device_token: string;
  created_at: string;
  updated_at: string | null;
}

export type GetMeResponse = Omit<IUser, 'password'> & {
  profile_picture_urls: ImageUrls | null;
};

export interface UpdateUserResponse {
  message: string;
}
