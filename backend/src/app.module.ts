import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { PrismaModule } from './prisma/prisma.module';
import { BotModule } from './bot/bot.module';
import { UserModule } from './user/user.module';
import { LinkValidatorModule } from './link-validator/link-validator.module';
import { MediaModule } from './media/media.module';
import { BullModule } from '@nestjs/bullmq';
import { RedisConnection } from 'bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
      }),
      inject: [ConfigService],
    }),
    BotModule,
    UserModule,
    LinkValidatorModule,
    MediaModule,
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    CacheModule.register({
      isGlobal: true,
      stores: [createKeyv('redis://localhost:6379')],
    }),
  ],
})
export class AppModule {}
