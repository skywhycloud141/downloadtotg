import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { BullModule } from '@nestjs/bullmq';
import { MediaProcessor } from './media.processor';

@Module({
  providers: [MediaService, MediaProcessor],
  imports: [
    BullModule.registerQueue({
      name: 'download-queue',
    }),
  ],
  exports: [MediaService],
})
export class MediaModule {}
