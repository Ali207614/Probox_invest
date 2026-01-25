import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ResetPinDto {
  @ApiProperty({
    description: 'User phone number',
    example: '+998901234567',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: 'Invalid phone number format' })
  phone_main: string;

  @ApiProperty({
    description: 'Reset token received from verification',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsString()
  reset_token: string;

  @ApiProperty({
    description: 'New 4-digit PIN code',
    example: '1234',
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  new_pin: string;

  @ApiProperty({
    description: 'Confirm new 4-digit PIN code',
    example: '1234',
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  confirm_pin: string;
}
