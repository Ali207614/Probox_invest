import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '+998901234567', description: 'Phone number' })
  @IsPhoneNumber('UZ', { context: { location: 'invalid_phone' } })
  @Matches(/^\+998[0-9]{9}$/, { message: 'Invalid phone number format' })
  phone_main!: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: 'Reset code sent' })
  message: string;

  @ApiProperty({ example: '123456', required: false })
  code?: string;
}
