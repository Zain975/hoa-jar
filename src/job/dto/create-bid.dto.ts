import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateBidDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Job ID is required' })
  jobId: string;

  @IsString()
  @IsNotEmpty({ message: 'Total price is required' })
  totalPrice: string;

  @IsString()
  @IsNotEmpty({ message: 'Cover letter is required' })
  coverLetter: string;
}
