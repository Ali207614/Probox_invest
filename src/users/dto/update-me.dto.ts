import { IsOptional, IsString, MinLength, MaxLength, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMeDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  first_name?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  last_name?: string;

  @ApiProperty({ example: '+998901234567', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+998[0-9]{9}$/, { message: 'Invalid phone number format' })
  phone_main?: string;

  @ApiProperty({
    example: '123456',
    required: false,
    description: 'Required if phone_main is changed',
  })
  @IsOptional()
  @IsString()
  verification_code?: string;

  @ApiProperty({ example: '+998901234567', required: false })
  @IsOptional()
  @IsString()
  phone_secondary?: string;

  @ApiProperty({ example: 'uz', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
