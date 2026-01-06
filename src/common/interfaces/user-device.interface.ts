export interface IUserDevice {
  id: string;
  user_id: string;
  fcm_token: string;
  device_type: 'ios' | 'android';
  last_active_at: string;
  created_at: string;
}
