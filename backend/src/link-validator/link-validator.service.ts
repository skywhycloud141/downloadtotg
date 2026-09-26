import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@prisma/client';
import { endWith } from 'rxjs';

@Injectable()
export class LinkValidatorService {
  constructor(private prisma: PrismaService) {}
  identifyPlatform(url: string): Platform | 'UNSUPPORTED' {
    let hostname: string;

    try {
      hostname = new URL(url).hostname.toLowerCase();
      console.log(hostname)
    } catch {
      return Platform.UNKNOWN;
    }

    switch (hostname) {
      case 'www.tiktok.com':
        return Platform.TIKTOK;
      case 'reddit.com':
        return Platform.REDDIT;
      case 'www.instagram.com':
        return Platform.INSTAGRAM;

      default:
        return 'UNSUPPORTED';
    }
  }
}
