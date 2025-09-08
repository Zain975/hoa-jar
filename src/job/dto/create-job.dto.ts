import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, IsArray, ArrayMinSize, IsEnum } from 'class-validator';

export enum JobType {
  HOME_SERVICE = 'HOME_SERVICE',
  COMMUNITY_SERVICE = 'COMMUNITY_SERVICE',
}

export class CreateJobDto {
  @IsString()
  @IsNotEmpty({ message: 'Job title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Job description is required' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'Charges are required' })
  charges: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service is required' })
  @IsUUID('4', { each: true, message: 'Each service ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Service IDs are required' })
  serviceIds: string[];

  @IsString()
  @IsNotEmpty({ message: 'Work duration is required' })
  workDuration: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startDate: string;

  @IsDateString()
  @IsNotEmpty({ message: 'End date is required' })
  endDate: string;

  @IsString()
  @IsNotEmpty({ message: 'Time slot is required' })
  timeSlot: string;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location: string;

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsEnum(JobType, { message: 'Job type must be either HOME_SERVICE or COMMUNITY_SERVICE' })
  @IsNotEmpty({ message: 'Job type is required' })
  jobType: JobType;

  @IsUUID()
  @IsOptional()
  apartmentId?: string; // Optional for home owners, required for community service
}
