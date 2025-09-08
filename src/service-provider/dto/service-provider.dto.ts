import { IsString, IsNotEmpty, IsOptional, IsArray, IsEmail, IsUUID } from 'class-validator';
import { IsStrongPassword } from 'src/common/decorators/password.decorator';

// Initial signup
export class ServiceProviderSignupDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @IsStrongPassword({
    message: 'Password must be at least 6 characters long and contain at least one capital letter, one number, and one special character',
  })
  password: string;
}

// Step 1: Government document upload
export class ServiceProviderStep1Dto {
  @IsUUID('4', { message: 'Invalid service provider ID format' })
  @IsNotEmpty({ message: 'Service provider ID is required' })
  serviceProviderId: string;
}

// Step 2: Services selection
export class ServiceProviderStep2Dto {
  @IsUUID('4', { message: 'Invalid service provider ID format' })
  @IsNotEmpty({ message: 'Service provider ID is required' })
  serviceProviderId: string;

  @IsArray()
  @IsNotEmpty({ message: 'At least one service must be selected' })
  serviceIds: string[];
}

// Step 3: Service rates
export class ServiceProviderStep3Dto {
  @IsUUID('4', { message: 'Invalid service provider ID format' })
  @IsNotEmpty({ message: 'Service provider ID is required' })
  serviceProviderId: string;

  @IsArray()
  @IsNotEmpty({ message: 'Service rates are required' })
  serviceRates: ServiceRateDto[];
}

export class ServiceRateDto {
  @IsUUID('4', { message: 'Invalid service ID format' })
  @IsNotEmpty({ message: 'Service ID is required' })
  serviceId: string;

  @IsString()
  @IsNotEmpty({ message: 'Rate is required' })
  rate: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// Step 4: Locations
export class ServiceProviderStep4Dto {
  @IsUUID('4', { message: 'Invalid service provider ID format' })
  @IsNotEmpty({ message: 'Service provider ID is required' })
  serviceProviderId: string;

  @IsArray()
  @IsNotEmpty({ message: 'At least one location must be provided' })
  locations: LocationDto[];
}

export class LocationDto {
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

// Step 5: Bio and profile picture
export class ServiceProviderStep5Dto {
  @IsUUID('4', { message: 'Invalid service provider ID format' })
  @IsNotEmpty({ message: 'Service provider ID is required' })
  serviceProviderId: string;

  @IsString()
  @IsNotEmpty({ message: 'Bio is required' })
  bio: string;
}

// Step 6: Bank details
export class ServiceProviderStep6Dto {
  @IsUUID('4', { message: 'Invalid service provider ID format' })
  @IsNotEmpty({ message: 'Service provider ID is required' })
  serviceProviderId: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank first name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank last name is required' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank account number is required' })
  bankAccountNumber: string;
}

// Login DTO
export class ServiceProviderLoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
