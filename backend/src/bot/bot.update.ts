import { Update, Start, Ctx, On, Action, Command } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkValidatorService } from '../link-validator/link-validator.service';
import { Platform } from '@prisma/client';
import { MediaService } from '../media/media.service';
import { waitForDebugger } from 'inspector';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Update() // Делает этот класс слушателем событий Telegram
export class BotUpdate {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly linkvalidator: LinkValidatorService,
    private readonly mediaService: MediaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  // Реакция на команду /start
  @Start()
  async onStart(@Ctx() ctx: Context) {
    // 1. Сохраняем или находим юзера в БД
    if (!ctx.from) {
      return;
    }
    const user = await this.userService.findOrCreateUser(ctx.from);

    // 2. Приветствуем его
    await ctx.reply(
      `Привет, ${user.firstName || 'друг'}! 👋\nПришли мне ссылку на видео (TikTok, Reddit), и я попробую его скачать.`,
    );
  }

  // Перехватываем любые текстовые сообщения (ссылки)
  @On('text')
  async onText(@Ctx() ctx: Context) {
    // Безопасно достаем текст (чтобы TypeScript не ругался)
    if (!ctx.from || !ctx.message) {
      return;
    }
    if (!('text' in ctx.message)) return;
    const text = ctx.message.text.trim();
    if(text.startsWith('/')) {
      //тут будет хуйня какая нибудь
    }
    // Базовая валидация: проверяем, что это хотя бы похоже на ссылку
    try {
      new URL(text);
    } catch (error) {
      await ctx.reply('Пожалуйста, отправь корректную ссылку 🔗');
      return;
    };

    const cacheKey = `pending_url_${ctx.from.id}`;
    await this.cacheManager.set(cacheKey,text,300000);

    const platform = this.linkvalidator.identifyPlatform(text);
    if (platform === 'UNSUPPORTED') {
      await ctx.reply(
        'Извини, я пока не умею скачивать с этого сайта. Поддерживаются: TikTok, Reddit, Instagram.',
      );
      return;
    }

    // Достаем юзера, чтобы привязать историю запроса к нему
    const user = await this.userService.findOrCreateUser(ctx.from);

    // Записываем попытку в базу данных
    await this.prisma.requestHistory.create({
      data: {
        url: text,
        userId: user.id,
        platform,

      },
    });

    // Отвечаем пользователю
    await ctx.reply('В каком формате скачиваем?', Markup.inlineKeyboard([
      Markup.button.callback('Видео', 'format_video'),
      Markup.button.callback('Аудио', 'format_audio')
    ]));
  }
 // Ловим всё, что начинается на format_
@Action(/format_(video|audio)/)
  async onFormatSelection(@Ctx() ctx: ActionContext) {
    // 1. Отвечаем Telegram
    await ctx.answerCbQuery();

    // 2. Type Guard: проверяем чат, отправителя и наличие match
    const match = ctx.match;
    if (!match || !ctx.chat || !ctx.from) return;

    // Теперь TypeScript знает, что match — это массив, а chat.id гарантированно существует
    const format = match[1]; 
    const cacheKey = `pending_url_${ctx.from.id}`;

    // 3. Достаем ссылку из Redis
    const url = await this.cacheManager.get<string>(cacheKey);

    if (!url) {
      await ctx.reply('Время ожидания истекло или ссылка потерялась. Пришли её заново 🔄');
      return;
    }

    await this.mediaService.addDownloadTask(url, ctx.chat.id, format);

    // 5. Очищаем кэш и обновляем сообщение
    await this.cacheManager.del(cacheKey);
    await ctx.editMessageText(`✅ Принято! Качаю ${format === 'video' ? 'видео' : 'аудио'}...`);
  }
  @Command('stats')
  async conStats(@Ctx() ctx: Context) {
  const telegramId = ctx.from?.id
  if(!telegramId){
    return;
  }
  const user = await this.prisma.user.findUnique({
    where:{
      telegramId: String(telegramId),
    }
  });
  if(!user){
    return ctx.reply(`Пользователь не найден`)
  }

  const history = await this.prisma.requestHistory.count({
    where: {
      userId: user.id,
    }
  });

  const platformGroup = await this.prisma.requestHistory.groupBy({
    by: ['platform'],
    where:{
      userId:user.id
    },
    _count: {
      platform:true
    }
  });
  const platformStats = platformGroup
    .map((item) => `${item.platform}: ${item._count.platform}`)
    .join(`\n`);
  await ctx.reply(
    `📊 Ваша статистика\n\n` +
    `📥 Всего скачано: ${history}\n\n` +
    `По платформам:\n${platformStats || 'Нет скачиваний'}`,
  );
  }
}

interface ActionContext extends Context {
  match:RegExpExecArray
}

