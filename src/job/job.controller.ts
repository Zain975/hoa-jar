import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobStatus } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/auth.guard';
import { LanguageService } from '../common/services/language.service';

@Controller('job')
@UseGuards(AuthGuard)
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly languageService: LanguageService,
  ) {}

  @Post()
  @Roles('HOME_OWNER', 'LEADER')
  async create(@Body() createJobDto: CreateJobDto, @Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const result = await this.jobService.create(createJobDto, user.id, user.role);
    
    return {
      ...result,
      job: result.job ? this.languageService.transformNestedObjectForLanguage(
        result.job,
        language,
        {
          services: ['service'],
          apartment: [],
          leader: [],
          creator: [],
          bids: ['serviceProvider']
        }
      ) : null
    };
  }

  @Get()
  async findAll(@Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const jobs = await this.jobService.findAll();
    
    return this.languageService.transformNestedArrayForLanguage(
      jobs,
      language,
      {
        services: ['service'],
        apartment: [],
        leader: [],
        creator: [],
        bids: ['serviceProvider']
      }
    );
  }

  @Get('my-jobs')
  @Roles('HOME_OWNER', 'LEADER')
  async findMyJobs(@Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const jobs = await this.jobService.findByCreator(user.id);
    
    return this.languageService.transformNestedArrayForLanguage(
      jobs,
      language,
      {
        services: ['service'],
        apartment: [],
        leader: [],
        creator: [],
        bids: ['serviceProvider']
      }
    );
  }

  @Get('pending-community-jobs')
  @Roles('LEADER')
  async findPendingCommunityJobs(@Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const jobs = await this.jobService.findPendingCommunityJobs(user.id);
    
    return this.languageService.transformNestedArrayForLanguage(
      jobs,
      language,
      {
        services: ['service'],
        apartment: [],
        creator: []
      }
    );
  }

  @Get('leader-jobs')
  @Roles('LEADER')
  async findLeaderJobs(@Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const jobs = await this.jobService.findByLeader(user.id);
    
    return this.languageService.transformNestedArrayForLanguage(
      jobs,
      language,
      {
        services: ['service'],
        apartment: [],
        bids: ['serviceProvider']
      }
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    const language = this.languageService.validateLanguage(lang);
    const job = await this.jobService.findOne(id);
    
    return this.languageService.transformNestedObjectForLanguage(
      job,
      language,
      {
        services: ['service'],
        apartment: [],
        leader: [],
        bids: ['serviceProvider']
      }
    );
  }

  @Patch(':id/approve')
  @Roles('LEADER')
  async approveCommunityJob(@Param('id') id: string, @Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const result = await this.jobService.approveCommunityJob(id, user.id);
    
    return {
      ...result,
      job: this.languageService.transformNestedObjectForLanguage(
        result.job,
        language,
        {
          services: ['service'],
          apartment: [],
          leader: [],
          creator: []
        }
      )
    };
  }

  @Patch(':id/reject')
  @Roles('LEADER')
  async rejectCommunityJob(@Param('id') id: string, @Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const result = await this.jobService.rejectCommunityJob(id, user.id);
    
    return {
      ...result,
      job: this.languageService.transformNestedObjectForLanguage(
        result.job,
        language,
        {
          services: ['service'],
          apartment: [],
          leader: [],
          creator: []
        }
      )
    };
  }

  @Patch(':id')
  @Roles('LEADER')
  async update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto, @Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const result = await this.jobService.update(id, updateJobDto, user.id);
    
    return {
      ...result,
      job: result.job ? this.languageService.transformNestedObjectForLanguage(
        result.job,
        language,
        {
          services: ['service'],
          apartment: [],
          leader: []
        }
      ) : null
    };
  }

  @Patch(':id/status')
  @Roles('LEADER')
  async updateStatus(@Param('id') id: string, @Body('status') status: JobStatus, @Req() req: any, @Query('lang') lang?: string) {
    const user = req['user'];
    const language = this.languageService.validateLanguage(lang);
    const result = await this.jobService.updateStatus(id, status, user.id);
    
    return {
      ...result,
      job: this.languageService.transformNestedObjectForLanguage(
        result.job,
        language,
        {
          services: ['service'],
          apartment: [],
          leader: []
        }
      )
    };
  }

  @Delete(':id')
  @Roles('LEADER')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req['user'];
    return this.jobService.remove(id, user.id);
  }
}
