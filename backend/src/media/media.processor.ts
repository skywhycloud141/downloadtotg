import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';

@Processor('download-queue')
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(@InjectBot() private bot: Telegraf<Context>) {
    super();
  }

  async process(job: Job<{ url: string; chatId: number; platform: string }>) {
    this.logger.log(`Начинаю обработку задачи: ${job.id}`);
    const { url, chatId, platform } = job.data;

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      this.logger.log(`Видео скачано: ${url}`);

      await this.bot.telegram.sendMessage(
        chatId,
        `✅ Твое видео с ${platform} готово!\n(Здесь будет сам файл)`,
      );
    } catch (error) {
      this.logger.error(`Ошибка при скачивании: ${error}`);
      await this.bot.telegram.sendMessage(
        chatId,
        '❌ Произошла ошибка при скачивании видео. Попробуй позже.',
      );
    }
  }
}
