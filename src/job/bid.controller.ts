import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { BidStatus } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.guard';
import { LanguageService } from '../common/services/language.service';

@Controller('bid')
@UseGuards(AuthGuard)
export class BidController {
  constructor(
    private readonly bidService: BidService,
    private readonly languageService: LanguageService,
  ) {}

  @Post()
  @Roles('SERVICE_PROVIDER')
  @UseInterceptors(FileInterceptor('document'))
  async create(
    @Body() createBidDto: CreateBidDto, 
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(pdf|doc|docx|jpg|jpeg|png)' }),
        ],
        fileIsRequired: false, // Document is optional
      }),
    )
    document?: Express.Multer.File,
    @Req() req?: any,
    @Query('lang') lang?: string,
  ) {
    const user = req['user'];
    
    // Check if this is a service provider
    if (user.type !== 'serviceProvider') {
      throw new ForbiddenException('Only service providers can create bids');
    }
    
    const language = this.languageService.validateLanguage(lang);
    const result = await this.bidService.create(createBidDto, user.id, document);
    
    return {
      ...result,
      bid: this.languageService.transformNestedObjectForLanguage(
        result.bid,
        language,
        {
          job: ['services', 'apartment'],
          serviceProvider: []
        }
      )
    };
  }

  @Get()
  async findAll(
    @Query('jobId') jobId?: string, 
    @Query('serviceProviderId') serviceProviderId?: string,
    @Query('lang') lang?: string
  ) {
    const language = this.languageService.validateLanguage(lang);
    let bids;
    
    if (jobId) {
      bids = await this.bidService.findByJob(jobId);
    } else if (serviceProviderId) {
      bids = await this.bidService.findByServiceProvider(serviceProviderId);
    } else {
      bids = await this.bidService.findAll();
    }
    
    return this.languageService.transformNestedArrayForLanguage(
      bids,
      language,
      {
        job: ['services', 'apartment'],
        serviceProvider: []
      }
    );
  }

  @Get('my-bids')
  @Roles('SERVICE_PROVIDER')
  async findMyBids(@Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    
    // Check if this is a service provider
    if (user.type !== 'serviceProvider') {
      throw new ForbiddenException('Only service providers can view their bids');
    }
    
    const language = this.languageService.validateLanguage(lang);
    const bids = await this.bidService.findByServiceProvider(user.id);
    
    return this.languageService.transformNestedArrayForLanguage(
      bids,
      language,
      {
        job: ['services', 'apartment'],
        serviceProvider: []
      }
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const bid = await this.bidService.findOne(id);
    
    return this.languageService.transformNestedObjectForLanguage(
      bid,
      language,
      {
        job: ['services', 'apartment'],
        serviceProvider: []
      }
    );
  }

  @Patch(':id/status')
  @Roles('LEADER')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: BidStatus,
    @Req() req: any,
    @Query('lang') lang?: string,
  ) {
    const user = req['user'];
    
    // Check if this is a leader
    if (user.role !== 'LEADER') {
      throw new ForbiddenException('Only leaders can update bid status');
    }
    
    const language = this.languageService.validateLanguage(lang);
    const result = await this.bidService.updateStatus(id, status, user.id);
    
    return {
      ...result,
      bid: this.languageService.transformNestedObjectForLanguage(
        result.bid,
        language,
        {
          job: ['services', 'apartment'],
          serviceProvider: []
        }
      )
    };
  }

  @Delete(':id')
  @Roles('SERVICE_PROVIDER')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req['user'];
    
    // Check if this is a service provider
    if (user.type !== 'serviceProvider') {
      throw new ForbiddenException('Only service providers can delete their bids');
    }
    
    return this.bidService.remove(id, user.id);
  }
}
