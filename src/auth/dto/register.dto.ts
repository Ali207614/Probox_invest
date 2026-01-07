import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsPhoneNumber, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '+998901234567', description: 'Phone number' })
  @IsPhoneNumber('UZ', {
    context: { location: 'invalid_phone' },
  })
  @Matches(/^\+998[0-9]{9}$/, { message: 'Invalid phone number format' })
  phone_main!: string;

  @ApiProperty({ example: '111', description: 'Password' })
  @IsString({
    context: { location: 'invalid_password' },
  })
  @MinLength(4, {
    context: { location: 'invalid_password_length_min' },
  })
  @MaxLength(20, {
    context: { location: 'invalid_password_length_max' },
  })
  password!: string;

  @ApiProperty({ example: '111', description: 'Password' })
  @IsString({
    context: { location: 'invalid_password' },
  })
  @MinLength(4, {
    context: { location: 'invalid_password_length_min' },
  })
  @MaxLength(20, {
    context: { location: 'invalid_password_length_max' },
  })
  confirm_password!: string;

  @ApiProperty({ example: '1234567890', description: 'Device FCM token' })
  @IsString({
    context: { location: 'invalid_device_token' },
  })
  @MinLength(1, {
    context: { location: 'invalid_device_token_length_min' },
  })
  @MaxLength(4096, {
    context: { location: 'invalid_device_token_length_max' },
  })
  device_token!: string;
}
