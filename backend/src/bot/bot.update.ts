import { Update, Start, Ctx, On, Action, Command } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkValidatorService } from '../link-validator/link-validator.service';
import { MediaService } from '../media/media.service';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Update()
export class BotUpdate {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly linkvalidator: LinkValidatorService,
    private readonly mediaService: MediaService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  // Реакция на команду /start
  @Start()
  async onStart(@Ctx() ctx: Context) {
    if (!ctx.from) {
      return;
    }

    const user = await this.userService.findOrCreateUser(ctx.from);

    await ctx.reply(
      `Привет, ${user.firstName || 'друг'}! 👋\n` +
      `Пришли мне ссылку на видео (TikTok, Reddit, Instagram), ` +
      `и я попробую его скачать.`,
    );
  }

  // Статистика
  @Command('stats')
  async conStats(@Ctx() ctx: Context) {
    const telegramId = ctx.from?.id;

    if (!telegramId) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: String(telegramId),
      },
    });

    if (!user) {
      return ctx.reply('Пользователь не найден');
    }

    const history = await this.prisma.requestHistory.count({
      where: {
        userId: user.id,
      },
    });

    const platformGroup = await this.prisma.requestHistory.groupBy({
      by: ['platform'],
      where: {
        userId: user.id,
      },
      _count: {
        platform: true,
      },
    });

    const platformStats = platformGroup
      .map((item) => `${item.platform}: ${item._count.platform}`)
      .join('\n');

    await ctx.reply(
      `📊 Ваша статистика\n\n` +
      `📥 Всего скачано: ${history}\n\n` +
      `По платформам:\n${platformStats || 'Нет скачиваний'}`,
    );
  }

  // Раскрываем короткую ссылку
  private async expandUrl(url: string): Promise<string> {
    const response = await fetch(url, {
      redirect: 'follow',
    });

    return response.url;
  }

  // Перехватываем текстовые сообщения
  @On('text')
  async onText(@Ctx() ctx: Context) {
    if (!ctx.from || !ctx.message) {
      return;
    }

    if (!('text' in ctx.message)) {
      return;
    }

    const text = ctx.message.text.trim();

    // Игнорируем команды
    if (text.startsWith('/')) {
      return;
    }

    // Проверяем URL
    try {
      new URL(text);
    } catch {
      await ctx.reply('Пожалуйста, отправь корректную ссылку 🔗');
      return;
    }

    // ========================================
    // РАСКРЫВАЕМ КОРОТКУЮ ССЫЛКУ
    // ========================================

    let expandedUrl: string;

    try {
      expandedUrl = await this.expandUrl(text);
    } catch (error) {
      console.error('Ошибка раскрытия URL:', error);

      await ctx.reply(
        'Не удалось открыть эту ссылку. Попробуй отправить её ещё раз 🔗',
      );

      return;
    }

    console.log('Original URL:', text);
    console.log('Expanded URL:', expandedUrl);

    // ========================================
    // ОПРЕДЕЛЯЕМ ПЛАТФОРМУ
    // ========================================

    const platform =
      this.linkvalidator.identifyPlatform(expandedUrl);

    if (platform === 'UNSUPPORTED') {
      await ctx.reply(
        'Извини, я пока не умею скачивать с этого сайта. ' +
        'Поддерживаются: TikTok, Reddit, Instagram.',
      );

      return;
    }

    // ========================================
    // СОХРАНЯЕМ URL В REDIS
    // ========================================

    const cacheKey = `pending_url_${ctx.from.id}`;

    await this.cacheManager.set(
      cacheKey,
      expandedUrl,
      300000,
    );

    // ========================================
    // СОХРАНЯЕМ ЗАПРОС В БД
    // ========================================

    const user = await this.userService.findOrCreateUser(
      ctx.from,
    );

    await this.prisma.requestHistory.create({
      data: {
        url: expandedUrl,
        userId: user.id,
        platform,
      },
    });

    // ========================================
    // СПРАШИВАЕМ ФОРМАТ
    // ========================================

    await ctx.reply(
      'В каком формате скачиваем?',
      Markup.inlineKeyboard([
        Markup.button.callback(
          'Видео',
          'format_video',
        ),
        Markup.button.callback(
          'Аудио',
          'format_audio',
        ),
      ]),
    );
  }

  // Обработка выбора формата
  @Action(/format_(video|audio)/)
  async onFormatSelection(
    @Ctx() ctx: ActionContext,
  ) {
    // Отвечаем Telegram на callback
    await ctx.answerCbQuery();

    const match = ctx.match;

    if (!match || !ctx.chat || !ctx.from) {
      return;
    }

    const format = match[1];

    const cacheKey = `pending_url_${ctx.from.id}`;

    // Получаем раскрытый URL из Redis
    const url = await this.cacheManager.get<string>(
      cacheKey,
    );

    if (!url) {
      await ctx.reply(
        'Время ожидания истекло или ссылка потерялась. ' +
        'Пришли её заново 🔄',
      );

      return;
    }

    console.log('Download URL:', url);
    console.log('Format:', format);

    // Передаём URL в MediaService
    await this.mediaService.addDownloadTask(
      url,
      ctx.chat.id,
      format,
    );

    // Удаляем URL из Redis
    await this.cacheManager.del(cacheKey);

    // Меняем сообщение
    await ctx.editMessageText(
      `✅ Принято! Качаю ${
        format === 'video' ? 'видео' : 'аудио'
      }...`,
    );
  }
}

interface ActionContext extends Context {
  match: RegExpExecArray;
}