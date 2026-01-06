export interface INotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'TRANSACTION' | 'SYSTEM' | 'EVENT';
  is_read: boolean;
  data: any;
  created_at: string;
}
