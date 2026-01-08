import { Controller, Get, Patch, Param, Req, UseGuards, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { GetNotificationsQueryDto, MarkAsReadParamDto } from './dto/notifications.dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginationResult } from '../common/utils/pagination.util';

@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  @ApiOkResponse({ type: NotificationResponseDto, isArray: true })
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<PaginationResult<NotificationResponseDto>> {
    const user_id = req.user.id;
    const parseLimit = Math.min(Number(query.limit) || 20, 100);
    const parseOffset = Number(query.offset) || 0;

    return this.notificationsService.getNotificationsByUser(user_id, parseOffset, parseLimit);
  }

  @Patch(':id/mark-as-read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async markAsRead(@Param() params: MarkAsReadParamDto): Promise<{ message: string }> {
    return this.notificationsService.markAsRead(params.id);
  }
}
