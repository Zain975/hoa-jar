import { Module } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { TranslationService } from '../common/services/translation.service';
import { LanguageService } from '../common/services/language.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_TIME },
    }),
  ],
  controllers: [ServiceController],
  providers: [ServiceService, PrismaService, TranslationService, LanguageService],
  exports: [ServiceService],
})
export class ServiceModule {}
