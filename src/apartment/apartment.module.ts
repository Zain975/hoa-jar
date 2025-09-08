import { Module } from '@nestjs/common';
import { ApartmentService } from './apartment.service';
import { ApartmentController } from './apartment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TranslationService } from '../common/services/translation.service';
import { LanguageService } from '../common/services/language.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApartmentController],
  providers: [ApartmentService, TranslationService, LanguageService],
  exports: [ApartmentService],
})
export class ApartmentModule {}
