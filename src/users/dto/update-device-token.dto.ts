import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDeviceTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging Token',
    example: 'ex_fcm_token_123456789',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    enum: ['ios', 'android'],
    description: 'Device type',
    example: 'android',
  })
  @IsEnum(['ios', 'android'])
  @IsNotEmpty()
  device_type: 'ios' | 'android';
}
