import { Controller, Get, Patch, Param, Req, UseGuards, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { GetNotificationsQueryDto, MarkAsReadParamDto } from './dto/notifications.dto';

@Controller('notifications')
@UseGuards(JwtUserAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<{ data: any[]; message: string }> {
    return this.notificationsService.getNotificationsByUser(
      req.user.id,
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  @Patch(':id/mark-as-read')
  async markAsRead(@Param() params: MarkAsReadParamDto): Promise<{ message: string }> {
    return this.notificationsService.markAsRead(params.id);
  }
}
