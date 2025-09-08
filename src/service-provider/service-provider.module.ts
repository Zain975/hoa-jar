import { Module } from '@nestjs/common';
import { ServiceProviderService } from './service-provider.service';
import { ServiceProviderController } from './service-provider.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { S3Service } from 'src/common/services/s3.service';
import { JwtModule } from '@nestjs/jwt';
import { TranslationService } from 'src/common/services/translation.service';
import { LanguageService } from 'src/common/services/language.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_TIME },
    }),
  ],
  providers: [ServiceProviderService, S3Service, TranslationService, LanguageService],
  controllers: [ServiceProviderController],
  exports: [ServiceProviderService],
})
export class ServiceProviderModule {}
