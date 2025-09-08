import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { BidService } from './bid.service';
import { BidController } from './bid.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from '../common/services/s3.service';
import { TranslationService } from '../common/services/translation.service';
import { LanguageService } from '../common/services/language.service';

@Module({
  imports: [PrismaModule],
  controllers: [JobController, BidController],
  providers: [JobService, BidService, S3Service, TranslationService, LanguageService],
  exports: [JobService, BidService],
})
export class JobModule {}
