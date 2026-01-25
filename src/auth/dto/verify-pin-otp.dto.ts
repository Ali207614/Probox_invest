import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyPinOtpDto {
  @ApiProperty({
    description: 'User phone number',
    example: '+998901234567',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: 'Invalid phone number format' })
  phone_main: string;

  @ApiProperty({
    description: '6-digit SMS verification code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code: string;
}
