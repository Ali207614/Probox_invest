import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { UsersService } from './users.service';
import { SapService } from '../sap/hana/sap-hana.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sapService: SapService,
  ) {}

  @UseGuards(JwtUserAuthGuard)
  @Get('me/income-summary')
  async getMyIncomeSummary(@Req() req: AuthenticatedRequest) {
    const cardCode: string = req.user.sap_card_code;

    return this.sapService.getBpBalanceAndMonthlyIncome(String(cardCode), '8710');
  }
}
