import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ message: string }> {
    if (!tokens.length) return { message: 'No tokens provided' };

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data: data || {},
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      console.log(`${response.successCount} messages were sent successfully`);

      const failedTokens: string[] = [];

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            console.error(`Token ${tokens[idx]} failed:`, resp.error);
          }
        });

        if (failedTokens.length > 0) {
          console.error(`Failed to send notification to ${failedTokens.length} tokens`);
        }
      }
      return failedTokens.length > 0
        ? { message: 'Failed to send push notification' }
        : { message: 'Push notification sent successfully' };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { message: 'Failed to send push notification' };
    }
  }
}
