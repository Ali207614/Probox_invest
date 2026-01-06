import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging Token',
    example: 'ex_fcm_token_123456789',
  })
  @IsString()
  @IsNotEmpty()
  fcm_token: string;

  @ApiProperty({
    enum: ['ios', 'android'],
    example: 'android',
  })
  @IsEnum(['ios', 'android'])
  @IsNotEmpty()
  device_type: 'ios' | 'android';
}
