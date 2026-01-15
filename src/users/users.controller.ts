import {
  Controller,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
  Query,
  Param,
  UploadedFile,
  Post,
  Delete,
  Body,
  Patch,
  HttpCode,
} from '@nestjs/common';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { SapService } from '../sap/hana/sap-hana.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaginationInterceptor } from '../common/interceptors/pagination.interceptor';
import { InvestorMetricItem } from '../common/interfaces/invester-summary.interface';
import {
  IBpMonthlyIncomeSummary,
  InvestorTransaction,
} from '../common/interfaces/business-partner.interface';
import { PaginationResult } from '../common/utils/pagination.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageUrls } from '../upload/upload.service';
import { UsersService } from './users.service';
import { GetMeResponse, UpdateUserResponse } from '../common/interfaces/user.interface';
import { UpdateMeDto } from './dto/update-me.dto';
import { InvestorTransactionsQueryDto } from './dto/investor-transactions-query.dto';
import { InvestorTransactionsFilterDto } from './dto/investor-transactions-filter.dto';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
export class UsersController {
  constructor(
    private readonly sapService: SapService,
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieves the authenticated user profile including personal information and profile picture URLs',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        first_name: { type: 'string', example: 'John' },
        last_name: { type: 'string', example: 'Doe' },
        phone_main: { type: 'string', example: '+998901234567' },
        phone_secondary: { type: 'string', nullable: true, example: '+998901234568' },
        username: { type: 'string', nullable: true, example: 'johndoe' },
        sap_card_code: { type: 'string', nullable: true, example: 'C00001' },
        sap_card_name: { type: 'string', nullable: true, example: 'John Doe' },
        sap_phone_number: { type: 'string', nullable: true, example: '+998901234567' },
        phone_verified: { type: 'boolean', example: true },
        profile_picture: { type: 'string', nullable: true, example: 'profiles/uuid/image.webp' },
        profile_picture_urls: {
          type: 'object',
          nullable: true,
          properties: {
            small: { type: 'string', example: 'https://s3.example.com/profiles/small.webp' },
            medium: { type: 'string', example: 'https://s3.example.com/profiles/medium.webp' },
            large: { type: 'string', example: 'https://s3.example.com/profiles/large.webp' },
          },
        },
        status: { type: 'string', enum: ['Open', 'Deleted', 'Pending', 'Banned'], example: 'Open' },
        is_active: { type: 'boolean', example: true },
        language: { type: 'string', example: 'uz' },
        device_token: { type: 'string', example: 'fcm_device_token_here' },
        created_at: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
        updated_at: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: '2024-01-16T12:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@Req() req: AuthenticatedRequest): Promise<GetMeResponse> {
    return this.usersService.getMe(req.user);
  }

  @Get('me/income-summary')
  @ApiOperation({
    summary: 'Get income summary',
    description: "Retrieves the current user's balance and monthly income summary from SAP",
  })
  @ApiResponse({
    status: 200,
    description: 'Income summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balance: { type: 'number', example: 150000000 },
        income_this_month: { type: 'number', example: 5000000 },
        income_last_month: { type: 'number', example: 4500000 },
        income_growth_percent: { type: 'number', nullable: true, example: 11.11 },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'SAP service unavailable or internal error' })
  async getMyIncomeSummary(@Req() req: AuthenticatedRequest): Promise<IBpMonthlyIncomeSummary> {
    const cardCode: string = req.user.sap_card_code;
    return this.sapService.getBpBalanceAndMonthlyIncome(String(cardCode), 8710);
  }

  @Get('me/investor-summary')
  @ApiOperation({
    summary: 'Get investor summary',
    description:
      'Retrieves detailed investor metrics including initial capital, additional capital, reinvest, and dividend information',
  })
  @ApiResponse({
    status: 200,
    description: 'Investor summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 4 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
          },
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                enum: ['initial_capital', 'additional_capital', 'reinvest', 'dividend'],
                example: 'dividend',
              },
              type: { type: 'string', enum: ['total_only', 'monthly'], example: 'monthly' },
              total: { type: 'number', example: 25000000 },
              this_month: { type: 'number', example: 2000000 },
              last_month: { type: 'number', example: 1800000 },
              growth_percent: { type: 'number', nullable: true, example: 11.11 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'SAP service unavailable or internal error' })
  async getMyInvestorSummary(@Req() req: AuthenticatedRequest): Promise<{
    meta: { total: number; limit: number; offset: number };
    data: InvestorMetricItem[];
  }> {
    const cardCode = req.user.sap_card_code;
    return this.sapService.getInvestorIncomeSummary(cardCode, 8710);
  }

  @Get('me/investor-transactions')
  @HttpCode(200)
  @UseInterceptors(PaginationInterceptor)
  @ApiOperation({
    summary: 'Get investor transactions',
    description:
      'Retrieves paginated list of investor transactions with optional filters for date range, transaction types, and direction',
  })
  @ApiBody({
    type: InvestorTransactionsFilterDto,
    description: 'Optional filters for transactions',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Investor transactions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 150 },
            limit: { type: 'number', example: 10 },
            offset: { type: 'number', example: 0 },
            total_income: { type: 'number', example: 50000000 },
            total_outcome: { type: 'number', example: -10000000 },
          },
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ref_date: { type: 'string', format: 'date', example: '2024-01-15' },
              trans_id: { type: 'number', example: 12345 },
              trans_type: { type: 'number', example: 30 },
              description: { type: 'string', nullable: true, example: 'Monthly dividend payment' },
              amount: { type: 'number', example: 2500000 },
              transaction_type: {
                type: 'string',
                enum: ['initial_capital', 'additional_capital', 'reinvest', 'dividend', 'other'],
                example: 'dividend',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters or filter values' })
  @ApiResponse({ status: 500, description: 'SAP service unavailable or internal error' })
  async getMyInvestorTransactions(
    @Req() req: AuthenticatedRequest,
    @Query() query: InvestorTransactionsQueryDto,
    @Body() filters: InvestorTransactionsFilterDto,
  ): Promise<PaginationResult<InvestorTransaction>> {
    const cardCode = req.user.sap_card_code;

    return this.sapService.getInvestorTransactions(cardCode, 8710, query, filters);
  }

  @Post(':cardCode/profile-picture')
  @ApiOperation({
    summary: 'Upload business partner profile picture',
    description:
      'Uploads and processes a profile picture for the specified business partner. Creates three image sizes: small (200px), medium (600px), and large (1200px)',
  })
  @ApiParam({
    name: 'cardCode',
    description: 'SAP Business Partner card code',
    example: 'C00001',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile picture file (JPEG, PNG, or WebP)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (max 5MB, formats: jpeg, png, webp)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Profile picture uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'object',
          properties: {
            small: {
              type: 'string',
              example: 'https://s3.example.com/bp-profiles/C00001/small.webp',
            },
            medium: {
              type: 'string',
              example: 'https://s3.example.com/bp-profiles/C00001/medium.webp',
            },
            large: {
              type: 'string',
              example: 'https://s3.example.com/bp-profiles/C00001/large.webp',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or no file uploaded' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not authorized to update this business partner',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @Param('cardCode') cardCode: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ urls: ImageUrls }> {
    return this.usersService.uploadProfilePicture(req.user, cardCode, file);
  }

  @Delete(':cardCode/profile-picture')
  @ApiOperation({
    summary: 'Delete business partner profile picture',
    description:
      'Deletes all profile picture sizes (small, medium, large) for the specified business partner',
  })
  @ApiParam({
    name: 'cardCode',
    description: 'SAP Business Partner card code',
    example: 'C00001',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile picture deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Not authorized to delete this business partner's picture",
  })
  @ApiResponse({ status: 404, description: 'Profile picture not found' })
  async deleteProfilePicture(
    @Param('cardCode') cardCode: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    return this.usersService.deleteProfilePicture(req.user, cardCode);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      "Updates the authenticated user's profile. If phone_main is changed, verification_code is required.",
  })
  @ApiBody({ type: UpdateMeDto })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User updated successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error or invalid verification code' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Body() updateMeDto: UpdateMeDto,
  ): Promise<UpdateUserResponse> {
    return this.usersService.update(req.user.id, updateMeDto);
  }
}
