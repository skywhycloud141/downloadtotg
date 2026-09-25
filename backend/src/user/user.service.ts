import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from 'telegraf/types';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateUser(from: User) {
    const telegramId = from.id.toString();

    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          username: from.username || null,
          firstName: from.first_name || null,
        },
      });
    }

    return user;
  }
}
