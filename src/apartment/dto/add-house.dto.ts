import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class AddHouseDto {
  @IsString()
  @IsNotEmpty({ message: 'House number is required' })
  houseNumber: string;

  @IsUUID()
  @IsNotEmpty({ message: 'Owner ID is required' })
  ownerId: string;
}
