import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../common/enums/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'Welcome' })
  title: string;

  @ApiProperty({ example: 'Welcome to our platform' })
  body: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ example: false })
  is_read: boolean;

  @ApiProperty({ required: false })
  data?: Record<string, any>;

  @ApiProperty()
  created_at: Date;
}
