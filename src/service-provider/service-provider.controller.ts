import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  Req,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServiceProviderService } from './service-provider.service';
import { Public } from 'src/auth/auth.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { LanguageService } from '../common/services/language.service';
import {
  ServiceProviderSignupDto,
  ServiceProviderStep1Dto,
  ServiceProviderStep2Dto,
  ServiceProviderStep3Dto,
  ServiceProviderStep4Dto,
  ServiceProviderStep5Dto,
  ServiceProviderStep6Dto,
  ServiceProviderLoginDto,
} from 'src/service-provider/dto/service-provider.dto';

@Controller('service-provider')
export class ServiceProviderController {
  constructor(
    private readonly serviceProviderService: ServiceProviderService,
    private readonly languageService: LanguageService,
  ) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: ServiceProviderSignupDto, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const result = await this.serviceProviderService.signup(dto);
    
    return {
      ...result,
      serviceProvider: this.languageService.transformObjectForLanguage(
        result.serviceProvider,
        language,
        ['name']
      )
    };
  }

  @Public()
  @Post('step1')
  @UseInterceptors(FileInterceptor('document'))
  async step1(
    @Body() dto: ServiceProviderStep1Dto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: '.(pdf|jpg|jpeg|png|gif)' }),
        ],
        fileIsRequired: true,
      }),
    )
    document: Express.Multer.File,
  ) {
    return this.serviceProviderService.step1(dto, document);
  }

  @Public()
  @Post('step2')
  async step2(@Body() dto: ServiceProviderStep2Dto) {
    return this.serviceProviderService.step2(dto);
  }

  @Public()
  @Post('step3')
  async step3(@Body() dto: ServiceProviderStep3Dto) {
    return this.serviceProviderService.step3(dto);
  }

  @Public()
  @Post('step4')
  async step4(@Body() dto: ServiceProviderStep4Dto) {
    return this.serviceProviderService.step4(dto);
  }

  @Public()
  @Post('step5')
  @UseInterceptors(FileInterceptor('profilePicture'))
  async step5(
    @Body() dto: ServiceProviderStep5Dto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|gif)' }),
        ],
        fileIsRequired: false,
      }),
    )
    profilePicture?: Express.Multer.File,
    @Query('lang') lang?: string,
  ) {
    const language = this.languageService.validateLanguage(lang);
    const result = await this.serviceProviderService.step5(dto, profilePicture);
    
    // Get updated service provider data for response
    const updatedServiceProvider = await this.serviceProviderService.getProfile(dto.serviceProviderId);
    
    return {
      ...result,
      serviceProvider: this.languageService.transformNestedObjectForLanguage(
        updatedServiceProvider,
        language,
        {
          services: ['service'],
          serviceRates: ['service'],
          locations: []
        }
      )
    };
  }

  @Public()
  @Post('step6')
  @UseInterceptors(FileInterceptor('bankDocument'))
  async step6(
    @Body() dto: ServiceProviderStep6Dto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: '.(pdf|jpg|jpeg|png)' }),
        ],
        fileIsRequired: false,
      }),
    )
    bankDocument?: Express.Multer.File,
    @Query('lang') lang?: string,
  ) {
    const language = this.languageService.validateLanguage(lang);
    const result = await this.serviceProviderService.step6(dto, bankDocument);
    
    // Get updated service provider data for response
    const updatedServiceProvider = await this.serviceProviderService.getProfile(dto.serviceProviderId);
    
    return {
      ...result,
      serviceProvider: this.languageService.transformNestedObjectForLanguage(
        updatedServiceProvider,
        language,
        {
          services: ['service'],
          serviceRates: ['service'],
          locations: []
        }
      )
    };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: ServiceProviderLoginDto, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const result = await this.serviceProviderService.login(dto);
    
    return {
      ...result,
      serviceProvider: this.languageService.transformObjectForLanguage(
        result.serviceProvider,
        language,
        ['name']
      )
    };
  }

  @Get('profile/:id')
  @UseGuards(AuthGuard)
  async getProfile(@Param('id') id: string, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const profile = await this.serviceProviderService.getProfile(id);
    
    return this.languageService.transformNestedObjectForLanguage(
      profile,
      language,
      {
        services: ['service'],
        serviceRates: ['service'],
        locations: []
      }
    );
  }

  @Public()
  @Get('step-status/:id')
  async getStepStatus(@Param('id') id: string, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const result = await this.serviceProviderService.getStepStatus(id);
    
    // The step status doesn't contain translatable data, but we return it for consistency
    return result;
  }
}
