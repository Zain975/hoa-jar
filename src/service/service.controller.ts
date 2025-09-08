import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Public } from 'src/auth/auth.guard';
import { LanguageService } from '../common/services/language.service';

@Controller('service')
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,
    private readonly languageService: LanguageService,
  ) {}

  @Public()
  @Post('seed')
  async seedServices() {
    return this.serviceService.seedServices();
  }

  @Public()
  @Get()
  async findAll(@Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const services = await this.serviceService.getAvailableServices();
    
    return this.languageService.transformArrayForLanguage(
      services,
      language,
      ['name', 'description']
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const service = await this.serviceService.findOne(id);
    
    if (!service) {
      return null;
    }
    
    return this.languageService.transformObjectForLanguage(
      service,
      language,
      ['name', 'description']
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const result = await this.serviceService.update(id, updateServiceDto);
    
    return this.languageService.transformObjectForLanguage(
      result,
      language,
      ['name', 'description']
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.serviceService.remove(id);
  }
}
