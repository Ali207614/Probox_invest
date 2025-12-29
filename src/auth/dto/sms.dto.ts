import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsPhoneNumber, Matches } from 'class-validator';

class SendCodeDataDto {
  @ApiProperty({ example: 300 })
  expires_in: number;

  @ApiProperty({ example: '2025-12-29T12:40:00.000Z' })
  expires_at: string;

  @ApiProperty({ example: 60 })
  retry_after: number;
}

export class SendCodeResponseDto {
  @ApiProperty({ example: 'Verification code sent successfully' })
  message: string;

  @ApiProperty({ type: SendCodeDataDto })
  data: SendCodeDataDto;
}

export class SmsDto {
  @ApiProperty({ example: '+998901234567', description: 'Phone number' })
  @IsPhoneNumber('UZ', {
    context: { location: 'invalid_phone' },
  })
  @Matches(/^\+998[0-9]{9}$/, { message: 'Invalid phone number format' })
  phone_main!: string;

  @ApiProperty({ example: 'uz', description: 'Lanuage' })
  @IsIn(['uz', 'ru'], {
    context: { location: 'invalid_language' },
  })
  language!: string;
}
