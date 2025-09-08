import { IsString, IsOptional, IsDateString, IsUUID, IsArray, ArrayMinSize, IsEnum } from 'class-validator';
import { JobType } from './create-job.dto';

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  charges?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service is required' })
  @IsUUID('4', { each: true, message: 'Each service ID must be a valid UUID' })
  @IsOptional()
  serviceIds?: string[];

  @IsString()
  @IsOptional()
  workDuration?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  timeSlot?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsEnum(JobType, { message: 'Job type must be either HOME_SERVICE or COMMUNITY_SERVICE' })
  @IsOptional()
  jobType?: JobType;

  @IsUUID()
  @IsOptional()
  apartmentId?: string;
}
