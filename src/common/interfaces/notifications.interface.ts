import { NotificationType } from '../enums/notification-type.enum';

export interface INotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  data?: Record<string, any>;
  created_at: Date;
}
