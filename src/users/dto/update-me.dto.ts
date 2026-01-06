import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
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
}
