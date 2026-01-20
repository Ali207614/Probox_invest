import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// ==================== Request DTOs ====================

export class GetAdminsQueryDto {
  @ApiProperty({
    required: false,
    default: 0,
    minimum: 0,
    description: 'Number of records to skip for pagination',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  offset?: number = 0;

  @ApiProperty({
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Maximum number of records to return',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number = 10;
}

// ==================== Response DTOs ====================

export class AdminResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'First name',
    example: 'Super',
  })
  first_name: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Admin',
  })
  last_name: string;

  @ApiProperty({
    description: 'Primary phone number',
    example: '+998901234567',
  })
  phone_main: string;

  @ApiProperty({
    description: 'Secondary phone number',
    example: null,
    nullable: true,
  })
  phone_secondary: string | null;

  @ApiProperty({
    description: 'Whether phone is verified',
    example: true,
  })
  phone_verified: boolean;

  @ApiProperty({
    description: 'Whether this admin has super admin privileges',
    example: true,
  })
  is_protected: boolean;

  @ApiProperty({
    description: 'SAP card code',
    example: null,
    nullable: true,
  })
  sap_card_code: string | null;

  @ApiProperty({
    description: 'SAP card name',
    example: null,
    nullable: true,
  })
  sap_card_name: string | null;

  @ApiProperty({
    description: 'Passport series',
    example: null,
    nullable: true,
  })
  passport_series: string | null;

  @ApiProperty({
    description: 'Birth date',
    example: null,
    nullable: true,
  })
  birth_date: string | null;

  @ApiProperty({
    description: 'ID card number',
    example: null,
    nullable: true,
  })
  id_card_number: string | null;

  @ApiProperty({
    description: 'Preferred language',
    example: 'uz',
  })
  language: string;

  @ApiProperty({
    description: 'Whether account is active',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Account status',
    example: 'Open',
  })
  status: string;

  @ApiProperty({
    description: 'Profile picture path',
    example: null,
    nullable: true,
  })
  profile_picture: string | null;

  @ApiProperty({
    description: 'Device token for notifications',
    example: 'super_admin_device_token_placeholder',
  })
  device_token: string;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-15T10:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-15T10:00:00.000Z',
  })
  updated_at: string;
}

export class PaginatedAdminsResponseDto {
  @ApiProperty({
    description: 'Array of admin records',
    type: [AdminResponseDto],
  })
  rows: AdminResponseDto[];

  @ApiProperty({
    description: 'Total number of admin records',
    example: 1,
  })
  total: number;

  @ApiProperty({
    description: 'Maximum records returned per request',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Number of records skipped',
    example: 0,
  })
  offset: number;
}
