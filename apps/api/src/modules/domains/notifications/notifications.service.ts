import { Injectable } from '@nestjs/common';
import { NotificationRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly storage: JsonDataLakeService) {}

  send(userId: string, title: string, body: string, channel: 'email' | 'sms' | 'in_app' = 'in_app') {
    return this.storage.create<NotificationRecord>('notifications', { userId, channel, title, body });
  }

  listForUser(userId: string) {
    return this.storage.query<NotificationRecord>('notifications', { where: { userId } as Partial<NotificationRecord>, sortBy: 'createdAt', sortDirection: 'desc' });
  }
}
