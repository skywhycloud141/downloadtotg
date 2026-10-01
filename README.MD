# Telegram Media Downloader Bot

A Telegram bot built with NestJS that accepts links to social media posts, asks whether to download video or audio, and queues media processing through Redis and BullMQ. It stores Telegram users and request history in SQLite and caches Telegram media file IDs for reuse.

## Features

- Handles TikTok, Reddit, Instagram, and YouTube URLs (including TikTok's `vt.tiktok.com` short links).
- Expands redirecting URLs before checking the host.
- Offers video or audio as a format choice in Telegram.
- Queues downloads with BullMQ and uses Redis for the queue and short-lived link cache.
- Tracks users and request history with Prisma and SQLite.
- Provides `/start` and `/stats` bot commands.

## Requirements

- Node.js 24 (the Docker image uses Node 24)
- npm
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- Redis 7, reachable by the backend at `redis:6379` in Docker or at the configured host when running locally
- FFmpeg for media processing (included in the Docker image)

## Configuration

The backend loads environment variables through NestJS ConfigModule and dotenv. Create `backend/.env` with:

```dotenv
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
DATABASE_URL=file:./dev.db
PORT=3000
```

`DATABASE_URL` is required by Prisma. For local SQLite usage, `file:./dev.db` creates the database relative to the backend working directory. Do not commit your bot token or `.env` file.

## Run locally

Start Redis first. The current application configuration connects to the hostname `redis` on port `6379`; if Redis is running directly on your machine, update the Redis host in `backend/src/app.module.ts` to match your local setup.

Then, from the repository root:

```bash
cd backend
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

The bot uses Telegram's bot API. Send `/start` to your bot, then send a supported link and choose a format. The NestJS HTTP endpoint listens on port `3000` by default and returns `Hello World!` at `/`.

## Run with Docker Compose

Set `TELEGRAM_BOT_TOKEN` and `DATABASE_URL` in `backend/.env`, then run:

```bash
docker compose up --build
```

Compose starts Redis and builds the backend from `backend/Dockerfile`. The app container needs the environment variables above; the current Compose file does not pass `backend/.env` into the container, so add an `env_file: ./backend/.env` entry to the `bot` service before using Compose. Redis is exposed on host port `6379`, and the bot HTTP service on port `3000`.

## Bot commands and behavior

- `/start` creates or finds the Telegram user and introduces the link workflow.
- `/stats` reports the number of recorded requests and a count grouped by platform.
- Send a URL as a plain text message. The bot validates the host, records the request, and presents format buttons.

## Development commands

Run these from `backend/`:

```bash
npm run start:dev  # watch mode
npm run build      # compile
npm run lint       # lint source and tests
npm test           # unit tests
npm run test:e2e   # end-to-end tests
```

## Project layout

```text
backend/
  prisma/       SQLite schema and database migrations
  src/bot/      Telegram commands, link handling, and format selection
  src/media/    BullMQ download queue and media processor
  src/user/     Telegram user persistence
  src/link-validator/ URL host detection
  src/prisma/   Prisma client setup
```

## Current implementation notes

- The link validator recognizes YouTube URLs, though the user-facing unsupported-site message currently lists only TikTok, Reddit, and Instagram.
- The bot offers an audio choice, but the current queue processor downloads and sends video regardless of the selected format.
- The request history is recorded when a supported link is submitted; the `/stats` count therefore represents recorded requests, not confirmed successful downloads.
- For durable data in Docker, configure a persistent volume for the SQLite database. The provided Compose file currently defines no database volume.
