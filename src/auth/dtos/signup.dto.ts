import { Role } from '@prisma/client';
import { IsStrongPassword, IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

// Single signup DTO for form-data with file upload
export class SignupDto {
  @IsString()
  @IsNotEmpty({ message: 'National ID is required' })
  nationalId: string;

  @IsString()
  @IsNotEmpty({ message: 'HOA number is required' })
  hoaNumber: string;

  @IsEnum(Role, {
    message: 'Role must be HOME_OWNER or LEADER',
  })
  role: Role;

  @IsStrongPassword()
  password: string;

  // Apartment details (optional - only for LEADER role if they want to create apartment)
  @IsString()
  @IsOptional()
  apartmentName?: string;

  @IsString()
  @IsOptional()
  apartmentAddress?: string;

  @IsString()
  @IsOptional()
  apartmentCity?: string;

  @IsString()
  @IsOptional()
  apartmentState?: string;

  @IsString()
  @IsOptional()
  apartmentCountry?: string;
}
