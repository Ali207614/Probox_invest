import { Controller, Get, Patch, Param, Req, UseGuards, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { GetNotificationsQueryDto, MarkAsReadParamDto } from './dto/notifications.dto';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginationResult } from '../common/utils/pagination.util';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get notifications',
    description:
      'Retrieves a paginated list of notifications for the authenticated user, ordered by creation date (newest first)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              title: { type: 'string', example: 'Monthly dividend payment' },
              body: {
                type: 'string',
                example: 'Your dividend payment of 2,500,000 UZS has been processed',
              },
              type: {
                type: 'string',
                enum: ['TRANSACTION', 'SYSTEM', 'EVENT'],
                example: 'TRANSACTION',
              },
              is_read: { type: 'boolean', example: false },
              data: {
                type: 'object',
                nullable: true,
                example: { amount: 2500000, transaction_id: 12345 },
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-15T10:30:00Z',
              },
            },
          },
        },
        total: { type: 'number', example: 45 },
        limit: { type: 'number', example: 20 },
        offset: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['limit must be a positive number', 'offset must not be less than 0'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a specific notification as read by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification UUID',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Notification marked as read' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid notification ID format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['id must be a UUID'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async markAsRead(@Param() params: MarkAsReadParamDto): Promise<{ message: string }> {
    return this.notificationsService.markAsRead(params.id);
  }
}
