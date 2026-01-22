import { Controller, Get, UseGuards, Query, Param, UseInterceptors, Body } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { AdminsAuthGuard } from '../common/guards/admins-auth.guard';
import { IUser } from 'src/common/interfaces/user.interface';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PaginationResult } from '../common/utils/pagination.util';
// import type { Admin } from '../common/interfaces/admin.interface';
// import { CurrentUser } from '../common/decorators/current-user.decorator';
// import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { SapService } from '../sap/hana/sap-hana.service';
import {
  IBpMonthlyIncomeSummary,
  InvestorTransaction,
} from '../common/interfaces/business-partner.interface';
import { InvestorMetricItem } from '../common/interfaces/invester-summary.interface';
import { InvestorTransactionsQueryDto } from '../users/dto/investor-transactions-query.dto';
import { InvestorTransactionsFilterDto } from '../users/dto/investor-transactions-filter.dto';
import { PaginationInterceptor } from '../common/interceptors/pagination.interceptor';

// Import DTOs for Swagger documentation
import {
  // GetAdminsQueryDto,
  // PaginatedAdminsResponseDto,
  UserDetailResponseDto,
  IncomeSummaryResponseDto,
  InvestorSummaryResponseDto,
  InvestorMetricItemTotalOnlyDto,
  InvestorMetricItemMonthlyDto,
  InvestorTransactionsPaginatedResponseDto,
} from './dto';

@ApiTags('Admins')
@ApiBearerAuth()
@Controller('admins')
@UseGuards(JwtUserAuthGuard, AdminsAuthGuard)
@ApiExtraModels(InvestorMetricItemTotalOnlyDto, InvestorMetricItemMonthlyDto)
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly sapService: SapService,
  ) {}

  // ==================== Admin Management ====================

  // @Get('/admins')
  // @ApiOperation({
  //   summary: 'Get all admins (Super Admin only)',
  //   description:
  //     'Retrieves a paginated list of all admin accounts. Only super admins (is_protected=true) can access this endpoint.',
  // })
  // @ApiQuery({
  //   name: 'offset',
  //   required: false,
  //   type: Number,
  //   description: 'Number of records to skip (default: 0)',
  //   example: 0,
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   required: false,
  //   type: Number,
  //   description: 'Maximum number of records to return (default: 10)',
  //   example: 10,
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'List of admins retrieved successfully',
  //   type: PaginatedAdminsResponseDto,
  // })
  // @ApiResponse({
  //   status: 401,
  //   description: 'Unauthorized - Invalid or missing token',
  // })
  // @ApiResponse({
  //   status: 403,
  //   description: "Forbidden - You don't have rights to perform this action",
  // })
  // async getAdmins(
  //   @Query() query: GetAdminsQueryDto,
  //   @CurrentUser() user: UserPayload,
  // ): Promise<PaginationResult<Admin>> {
  //   return this.adminsService.getAdmins(user.id, query.offset ?? 0, query.limit ?? 10);
  // }

  // ==================== User Management ====================

  @Get('users')
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description:
      'Retrieves a list of all registered users with their full profile details including SAP information and profile pictures.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: [UserDetailResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getUsers(): Promise<IUser[]> {
    return this.adminsService.getUsers();
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get user full details (Admin only)',
    description:
      'Retrieves the complete profile of a specific user by their UUID. Includes SAP card info, verification status, and profile pictures.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
    type: UserDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserDetail(@Param('id') id: string): Promise<IUser> {
    return this.adminsService.getUserDetails(id);
  }

  @Get('users/:id/income-summary')
  @ApiOperation({
    summary: 'Get user income summary (Admin only)',
    description:
      "Retrieves the specified user's balance and monthly income summary from SAP. Includes current balance, this month's and last month's income with growth percentage.",
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Income summary retrieved successfully',
    type: IncomeSummaryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserIncomeSummary(@Param('id') id: string): Promise<IBpMonthlyIncomeSummary> {
    const user = await this.adminsService.getUserDetails(id);
    return this.sapService.getBpBalanceAndMonthlyIncome(String(user.sap_card_code), 8710);
  }

  @Get('users/:id/investor-summary')
  @ApiOperation({
    summary: 'Get user investor summary (Admin only)',
    description:
      'Retrieves detailed investor metrics for the specified user. Includes initial capital, additional capital, reinvestment fund, and dividend information with monthly breakdowns.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Investor summary retrieved successfully',
    type: InvestorSummaryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserInvestorSummary(@Param('id') id: string): Promise<{
    meta: { total: number; limit: number; offset: number };
    data: InvestorMetricItem[];
  }> {
    const user = await this.adminsService.getUserDetails(id);
    return this.sapService.getInvestorIncomeSummary(user.sap_card_code as string, 8710);
  }

  @Get('users/:id/investor-transactions')
  @UseInterceptors(PaginationInterceptor)
  @ApiOperation({
    summary: 'Get user investor transactions (Admin only)',
    description:
      'Retrieves a paginated list of investor transactions for the specified user. Supports filtering by date range, transaction types, and direction.',
  })
  @ApiParam({
    name: 'id',
    description: 'User UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of records to return (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip (default: 0)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Investor transactions retrieved successfully',
    type: InvestorTransactionsPaginatedResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserInvestorTransactions(
    @Param('id') id: string,
    @Query() query: InvestorTransactionsQueryDto,
    @Body() filters: InvestorTransactionsFilterDto,
  ): Promise<PaginationResult<InvestorTransaction>> {
    const user = await this.adminsService.getUserDetails(id);
    return this.sapService.getInvestorTransactions(
      user.sap_card_code as string,
      8710,
      query,
      filters,
    );
  }
}
