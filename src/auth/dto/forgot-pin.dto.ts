import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ForgotPinDto {
  @ApiProperty({
    description: 'User phone number',
    example: '+998901234567',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: 'Invalid phone number format' })
  phone_main: string;
}
