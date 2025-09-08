import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateApartmentDto {
  @IsString()
  @IsNotEmpty({ message: 'HOA number is required' })
  hoaNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'Apartment name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;
}
