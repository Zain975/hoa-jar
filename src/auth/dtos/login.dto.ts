import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'National ID is required' })
  nationalId: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
