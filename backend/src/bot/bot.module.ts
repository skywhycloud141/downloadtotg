import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { UserModule } from '../user/user.module';
import { LinkValidatorModule } from '../link-validator/link-validator.module';
import { LinkValidatorService } from '../link-validator/link-validator.service';
import { MediaModule } from '../media/media.module';

@Module({
  providers: [BotUpdate],
  imports: [UserModule, LinkValidatorModule, MediaModule],
})
export class BotModule {}
