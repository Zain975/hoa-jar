import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApartmentService } from './apartment.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { AddHouseDto } from './dto/add-house.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.guard';
import { LanguageService } from '../common/services/language.service';

@Controller('apartment')
@UseGuards(AuthGuard)
export class ApartmentController {
  constructor(
    private readonly apartmentService: ApartmentService,
    private readonly languageService: LanguageService,
  ) {}

  @Post()
  @Roles('LEADER')
  async create(@Body() createApartmentDto: CreateApartmentDto, @Req() req: Request, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const result = await this.apartmentService.create(createApartmentDto, user.id);
    
    return {
      ...result,
      apartment: this.languageService.transformNestedObjectForLanguage(
        result.apartment,
        language,
        {
          houses: ['apartment'],
          leader: [],
          _count: []
        }
      )
    };
  }

  @Get()
  async findAll(@Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const apartments = await this.apartmentService.findAll();
    
    return this.languageService.transformNestedArrayForLanguage(
      apartments,
      language,
      {
        houses: ['apartment'],
        leader: [],
        _count: []
      }
    );
  }

  @Get('my-apartments')
  @Roles('LEADER')
  async findMyApartments(@Req() req: Request, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const apartments = await this.apartmentService.findByLeader(user.id);
    
    return this.languageService.transformNestedArrayForLanguage(
      apartments,
      language,
      {
        houses: ['apartment'],
        jobs: ['services'],
        _count: []
      }
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const apartment = await this.apartmentService.findOne(id);
    
    return this.languageService.transformNestedObjectForLanguage(
      apartment,
      language,
      {
        houses: ['apartment'],
        jobs: ['services'],
        leader: [],
        _count: []
      }
    );
  }

  @Patch(':id')
  @Roles('LEADER')
  async update(
    @Param('id') id: string,
    @Body() updateApartmentDto: CreateApartmentDto,
    @Req() req: Request,
    @Query('lang') lang?: string,
  ) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const result = await this.apartmentService.update(id, updateApartmentDto, user.id);
    
    return {
      ...result,
      apartment: this.languageService.transformNestedObjectForLanguage(
        result.apartment,
        language,
        {
          houses: ['apartment'],
          leader: [],
          _count: []
        }
      )
    };
  }

  @Delete(':id')
  @Roles('LEADER')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const user = req['user'];
    return this.apartmentService.remove(id, user.id);
  }

  @Post(':id/houses')
  @Roles('LEADER')
  async addHouse(
    @Param('id') apartmentId: string,
    @Body() houseData: AddHouseDto,
    @Req() req: Request,
    @Query('lang') lang?: string,
  ) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const result = await this.apartmentService.addHouse(apartmentId, houseData, user.id);
    
    return {
      ...result,
      house: this.languageService.transformNestedObjectForLanguage(
        result.house,
        language,
        {
          apartment: [],
          owner: []
        }
      )
    };
  }

  @Delete('houses/:houseId')
  @Roles('LEADER')
  async removeHouse(@Param('houseId') houseId: string, @Req() req: Request) {
    const user = req['user'];
    return this.apartmentService.removeHouse(houseId, user.id);
  }
}
