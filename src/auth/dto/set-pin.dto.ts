import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class SetPinDto {
  @ApiProperty({
    description: '4-digit PIN code',
    example: '1234',
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @ApiProperty({
    description: 'Confirm 4-digit PIN code',
    example: '1234',
  })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  confirm_pin: string;
}
