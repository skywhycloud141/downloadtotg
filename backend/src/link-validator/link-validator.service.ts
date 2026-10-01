import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@prisma/client';

@Injectable()
export class LinkValidatorService {
  constructor(private prisma: PrismaService) {}

  identifyPlatform(url: string): Platform | 'UNSUPPORTED' {
    let hostname: string;

    try {
      hostname = new URL(url).hostname.toLowerCase();

      console.log('Hostname:', hostname);
    } catch {
      return Platform.UNKNOWN;
    }

    switch (hostname) {
      case 'www.tiktok.com':
      case 'tiktok.com':
      case 'vt.tiktok.com':
        return Platform.TIKTOK;

      case 'www.reddit.com':
      case 'reddit.com':
        return Platform.REDDIT;

      case 'www.instagram.com':
      case 'instagram.com':
        return Platform.INSTAGRAM;

      case 'www.youtube.com':
      case 'youtube.com':
        return Platform.YOUTUBE;

      default:
        return 'UNSUPPORTED';
    }
  }
}