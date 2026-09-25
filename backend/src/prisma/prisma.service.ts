import 'dotenv/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = `${process.env.DATABASE_URL}`;

    const adapter = new PrismaBetterSqlite3({ url: connectionString });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
