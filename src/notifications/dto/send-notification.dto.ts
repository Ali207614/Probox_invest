import { NotificationType } from 'src/common/enums/notification-type.enum';

export class SendNotificationDto {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
}
