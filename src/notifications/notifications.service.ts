import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { FirebaseService } from './firebase.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { IUser } from 'src/common/interfaces/user.interface';
import { PaginationResult } from 'src/common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly firebase_service: FirebaseService,
  ) {}

  async sendToUser(user_id: string, payload: SendNotificationDto): Promise<void> {
    console.log('Sending notification...');
    console.log('Trying to store the data into database...');
    await this.knex('notifications').insert({
      user_id: user_id,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      data: payload.data || {},
      created_at: new Date(),
    });

    console.log('Storing successful. Trying to fetch device tokens from database...');

    const tokens = (await this.knex('users')
      .where({ id: user_id })
      .pluck('device_token')) as string[];

    console.log('Tokens fetched. Trying to send push notification...');

    if (tokens.length > 0) {
      const sender = await this.firebase_service.sendPushNotification(
        tokens,
        payload.title,
        payload.body,
        payload.data,
      );

      console.log(sender);
    }

    return;
  }

  async getNotificationsByUser(
    user_id: string,
    offset: number,
    limit: number,
  ): Promise<PaginationResult<NotificationResponseDto>> {
    const rows = await this.knex('notifications')
      .select('*')
      .where({ user_id })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.knex('notifications').where({ user_id }).count('*');

    return {
      rows: rows as NotificationResponseDto[],
      total: Number(total),
      limit,
      offset,
    };
  }

  async markAsRead(id: string): Promise<{ message: string }> {
    await this.knex('notifications').where({ id }).update({ is_read: true });
    return { message: 'Notification marked as read' };
  }

  async sendToManyUsers(
    payload: SendNotificationDto,
    user_ids: string[],
  ): Promise<{ message: string }> {
    let users: string[] = [];
    if (user_ids.length === 0) {
      users = (await this.knex<IUser>('users')
        .where({ is_active: true })
        .whereNotNull('device_token')
        .pluck('device_token')) as string[];
    } else {
      users = (await this.knex<IUser>('users')
        .whereIn('id', user_ids)
        .whereNotNull('device_token')
        .pluck('device_token')) as string[];
    }

    console.log('Sending push notifications...');

    const sender = await this.firebase_service.sendPushNotification(
      users,
      payload.title,
      payload.body,
      payload.data,
    );

    console.log(sender);

    return sender;
  }
}
