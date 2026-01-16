import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '+998901234567' })
  @IsPhoneNumber('UZ', { context: { location: 'invalid_phone' } })
  @Matches(/^\+998[0-9]{9}$/, { message: 'Invalid phone number format' })
  phone_main!: string;

  @ApiProperty({ example: 'newpass123' })
  @IsString()
  @MinLength(4, { context: { location: 'invalid_password_min' } })
  @MaxLength(20, { context: { location: 'invalid_password_max' } })
  new_password!: string;

  @ApiProperty({ example: 'newpass123' })
  @IsString()
  @MinLength(4, { context: { location: 'invalid_password_min' } })
  @MaxLength(20, { context: { location: 'invalid_password_max' } })
  confirm_new_password!: string;

  @ApiProperty({ example: 'reset-token-uuid-v4' })
  @IsString()
  reset_token!: string;
}
