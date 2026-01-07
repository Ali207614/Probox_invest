import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { FirebaseService } from './firebase.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly firebase_service: FirebaseService,
  ) {}

  async sendToUser(
    user_id: string,
    payload: {
      title: string;
      body: string;
      type: string;
      data?: Record<string, string>;
    },
  ): Promise<{ message: string }> {
    await this.knex('notifications').insert({
      user_id: user_id,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      data: JSON.stringify(payload.data || {}),
      created_at: new Date(),
    });

    const tokens = (await this.knex('users')
      .where({ id: user_id })
      .pluck('device_token')) as string[];

    if (tokens.length > 0) {
      await this.firebase_service.sendPushNotification(
        tokens,
        payload.title,
        payload.body,
        payload.data,
      );
    }

    return { message: 'Notification sent successfully' };
  }

  async getNotificationsByUser(
    user_id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: any[]; message: string }> {
    const data = await this.knex('notifications')
      .where({ user_id: user_id })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { data: data, message: 'Notifications fetched successfully' };
  }

  async markAsRead(id: string): Promise<{ message: string }> {
    await this.knex('notifications').where({ id }).update({ is_read: true });
    return { message: 'Notification marked as read' };
  }
}
