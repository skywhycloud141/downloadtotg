import { Module } from '@nestjs/common';
import { LinkValidatorService } from './link-validator.service';

@Module({
  providers: [LinkValidatorService],
  exports: [LinkValidatorService],
})
export class LinkValidatorModule {}
