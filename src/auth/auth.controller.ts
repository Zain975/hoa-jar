import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Patch,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { Public } from './auth.guard';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { LanguageService } from '../common/services/language.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
  ) {}

  @Public()
  @Post('signup')
  @UseInterceptors(FileInterceptor('document'))
  async signUp(
    @Body() signupDto: SignupDto,
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
    @Query('lang') lang?: string,
  ) {
    const language = this.languageService.validateLanguage(lang);
    const result = await this.authService.signup(signupDto, document);
    
    return {
      ...result,
      apartment: result.apartment ? this.languageService.transformObjectForLanguage(
        result.apartment,
        language,
        ['name', 'address', 'city', 'state', 'country']
      ) : null
    };
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const result = await this.authService.login(loginDto);
    
    // Transform the user object with proper handling of apartment field
    const transformedUser = this.languageService.transformNestedObjectForLanguage(
      result.user,
      language,
      {
        managedApartments: ['houses', 'jobs', 'leader', '_count'],
        ownedHouses: ['apartment'],
        postedJobs: ['services', 'apartment', 'bids']
      }
    );
    
    // Manually transform the apartment field if it exists
    if (transformedUser.apartment) {
      transformedUser.apartment = this.languageService.transformObjectForLanguage(
        transformedUser.apartment,
        language,
        ['name', 'address', 'city', 'state', 'country']
      );
    }
    
    return {
      ...result,
      user: transformedUser
    };
  }

  @Patch('change-password')
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const user = req['user'];
    return this.authService.changePassword(user.id, dto);
  }
}
