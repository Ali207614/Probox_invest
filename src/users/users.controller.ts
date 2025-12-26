import { Controller, Get, Req, UseGuards, UseInterceptors, Query } from '@nestjs/common';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { UsersService } from './users.service';
import { SapService } from '../sap/hana/sap-hana.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PaginationInterceptor } from '../common/interceptors/pagination.interceptor';

@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sapService: SapService,
  ) {}

  @Get('me/income-summary')
  async getMyIncomeSummary(@Req() req: AuthenticatedRequest) {
    const cardCode: string = req.user.sap_card_code;
    return this.sapService.getBpBalanceAndMonthlyIncome(String(cardCode), 8710);
  }

  @Get('me/investor-summary')
  async getMyInvestorSummary(@Req() req: AuthenticatedRequest) {
    const cardCode = req.user.sap_card_code;
    return this.sapService.getInvestorIncomeSummary(cardCode, 8710);
  }

  // async getMyInvestorTransactions(@Req() req: AuthenticatedRequest) {
  //   const cardCode = req.user.sap_card_code;
  //   const investorTransactions = await this.sapService.getInvestorTransactions(cardCode, 8710);
  //   console.log(investorTransactions.reduce((a, b) => a + +b.amount, 0));
  //   return investorTransactions;
  // }

  @Get('me/investor-transactions')
  @UseInterceptors(PaginationInterceptor)
  async getMyInvestorTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    const cardCode = req.user.sap_card_code;

    const parsedLimit = Math.min(Number(limit) || 20, 100);
    const parsedOffset = Number(offset) || 0;

    return this.sapService.getInvestorTransactions(cardCode, 8710, parsedLimit, parsedOffset);
  }
}
