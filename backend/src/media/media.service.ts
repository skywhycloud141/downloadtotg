import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class MediaService {
  constructor(@InjectQueue('download-queue') private mediaQueue: Queue) {}
  async addDownloadTask(
    url: string,
    chatId: number | undefined,
    platform: string,
  ) {
    await this.mediaQueue.add('process-video', {
      url,
      chatId,
      platform,
    });
  }
}
