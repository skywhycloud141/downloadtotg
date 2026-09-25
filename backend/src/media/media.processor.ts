import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';

import downloadMedia from 'media-downloader-ez'; 
import { PrismaService } from '../prisma/prisma.service';
import { Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';

interface MediaJobData {
  url: string;
  chatId: number;
}

@Processor('media-queue')
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {
    super();
  }

  async process(job: Job<MediaJobData>): Promise<void> {
    const { url, chatId } = job.data;
    
    let downloadedFileName: string | null = null; 
    
    try {
      this.logger.log(`Начало обработки. URL: ${url}`);

      // 1. ПРОВЕРКА КЭША
     const cachedMedia = await this.prisma.mediaCache.findUnique({
  where: { 
    originalUrl_format: {
      originalUrl: url,
      format: 'video'
    }
  }
});

      if (cachedMedia) {
        this.logger.log(`Найдено в кэше! Мгновенная отправка file_id: ${cachedMedia.telegramFileId}`);
        await this.bot.telegram.sendVideo(chatId, cachedMedia.telegramFileId);
        return;
      }

      this.logger.log('Качаю видео через media-downloader-ez...');
      
      downloadedFileName = await downloadMedia(url, { 
        limitSizeMB: 45,
        autocrop: true 
      });

      const filePath = path.resolve(process.cwd(), downloadedFileName);
      this.logger.log(`Видео сохранено локально: ${filePath}`);

      const sentMessage = await this.bot.telegram.sendVideo(chatId, { 
        source: filePath
      });

      await this.prisma.mediaCache.create({
        data: {
          format:'video',
          originalUrl: url,
          telegramFileId: sentMessage.video.file_id, // Берем ID загруженного файла
        }
      });

      this.logger.log(`Успех! Файл отправлен и закэширован.`);

    } catch (error) {
      this.logger.error(`Ошибка при скачивании: ${error}`, error);
      await this.bot.telegram.sendMessage(chatId, '❌ Произошла ошибка. Не удалось скачать это видео.');
      throw error; 
    } finally {
      if (downloadedFileName) {
        const filePath = path.resolve(process.cwd(), downloadedFileName);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`Мусор убран: Файл ${downloadedFileName} удален с сервера.`);
        }
      }
    }
  }
}