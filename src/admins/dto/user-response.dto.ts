import { ApiProperty } from '@nestjs/swagger';

// ==================== Shared Sub-DTOs ====================

export class ProfilePictureUrlsDto {
  @ApiProperty({
    description: 'Small size profile picture URL',
    example: 'https://bucket.s3.amazonaws.com/sm/profile-123.webp',
    nullable: true,
  })
  sm: string | null;

  @ApiProperty({
    description: 'Medium size profile picture URL',
    example: 'https://bucket.s3.amazonaws.com/md/profile-123.webp',
    nullable: true,
  })
  md: string | null;

  @ApiProperty({
    description: 'Large size profile picture URL',
    example: 'https://bucket.s3.amazonaws.com/lg/profile-123.webp',
    nullable: true,
  })
  lg: string | null;
}

// ==================== Response DTOs ====================

export class UserDetailResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: "User's first name (derived from sap_card_name)",
    example: 'Shakhzod',
  })
  first_name: string;

  @ApiProperty({
    description: "User's last name (derived from sap_card_name)",
    example: 'Alimov',
  })
  last_name: string;

  @ApiProperty({
    description: 'Primary phone number',
    example: '+998901234567',
  })
  phone_main: string;

  @ApiProperty({
    description: 'Secondary phone number',
    example: '+998907654321',
    nullable: true,
  })
  phone_secondary: string | null;

  @ApiProperty({
    description: 'Whether the phone number has been verified',
    example: true,
  })
  phone_verified: boolean;

  @ApiProperty({
    description: 'SAP Business Partner Card Code',
    example: 'C10001',
    nullable: true,
  })
  sap_card_code: string | null;

  @ApiProperty({
    description: 'SAP Business Partner Card Name (Full Name)',
    example: 'Shakhzod Alimov',
    nullable: true,
  })
  sap_card_name: string | null;

  @ApiProperty({
    description: 'User account status',
    enum: ['Open', 'Deleted', 'Pending', 'Banned'],
    example: 'Open',
  })
  status: 'Open' | 'Deleted' | 'Pending' | 'Banned';

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-15T10:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-15T10:00:00.000Z',
    nullable: true,
  })
  updated_at: string | null;

  @ApiProperty({
    description: 'Firebase Cloud Messaging device token',
    example: 'fcm_token_abc123xyz',
  })
  device_token: string;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: "User's preferred language",
    enum: ['uz', 'ru', 'en'],
    example: 'uz',
  })
  language: string;

  @ApiProperty({
    description: 'Signed URLs for profile pictures in different sizes',
    type: ProfilePictureUrlsDto,
    nullable: true,
  })
  profile_picture_urls: ProfilePictureUrlsDto | null;
}

export class UserListResponseDto {
  @ApiProperty({
    description: 'Array of user records',
    type: [UserDetailResponseDto],
  })
  data: UserDetailResponseDto[];
}
