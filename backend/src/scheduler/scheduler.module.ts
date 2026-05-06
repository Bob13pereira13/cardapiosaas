import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
