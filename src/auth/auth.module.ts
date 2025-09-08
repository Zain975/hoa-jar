import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { ApartmentModule } from 'src/apartment/apartment.module';
import { S3Service } from 'src/common/services/s3.service';
import { TranslationService } from 'src/common/services/translation.service';
import { LanguageService } from 'src/common/services/language.service';

@Module({
  imports: [
    PrismaModule,
    ApartmentModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_TIME },
    }),
  ],
  providers: [
    AuthService,
    S3Service,
    TranslationService,
    LanguageService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
