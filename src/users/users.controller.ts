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
} from '@nestjs/common';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { SapService } from '../sap/hana/sap-hana.service';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
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
import { GetMeResponse } from '../common/interfaces/user.interface';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
export class UsersController {
  constructor(
    private readonly sapService: SapService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtUserAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest): Promise<GetMeResponse> {
    return this.usersService.getMe(req.user);
  }

  @Get('me/income-summary')
  async getMyIncomeSummary(@Req() req: AuthenticatedRequest): Promise<IBpMonthlyIncomeSummary> {
    const cardCode: string = req.user.sap_card_code;
    return this.sapService.getBpBalanceAndMonthlyIncome(String(cardCode), 8710);
  }

  @Get('me/investor-summary')
  async getMyInvestorSummary(@Req() req: AuthenticatedRequest): Promise<{
    meta: { total: number; limit: number; offset: number };
    data: InvestorMetricItem[];
  }> {
    const cardCode = req.user.sap_card_code;
    return this.sapService.getInvestorIncomeSummary(cardCode, 8710);
  }

  @Get('me/investor-transactions')
  @UseInterceptors(PaginationInterceptor)
  async getMyInvestorTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ): Promise<PaginationResult<InvestorTransaction>> {
    const cardCode = req.user.sap_card_code;

    const parsedLimit = Math.min(Number(limit) || 20, 100);
    const parsedOffset = Number(offset) || 0;

    return this.sapService.getInvestorTransactions(cardCode, 8710, parsedLimit, parsedOffset);
  }

  @UseGuards(JwtUserAuthGuard)
  @Post(':cardCode/profile-picture')
  @ApiOperation({ summary: 'Upload business partner profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @Param('cardCode') cardCode: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ urls: ImageUrls }> {
    return this.usersService.uploadProfilePicture(req.user, cardCode, file);
  }

  @UseGuards(JwtUserAuthGuard)
  @Delete(':cardCode/profile-picture')
  @ApiOperation({ summary: 'Delete business partner profile picture' })
  async deleteProfilePicture(
    @Param('cardCode') cardCode: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    return this.usersService.deleteProfilePicture(req.user, cardCode);
  }

  @UseGuards(JwtUserAuthGuard)
  @Patch('me/name')
  @ApiOperation({ summary: 'Update the current user profile' })
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() updateMeDto: UpdateMeDto,
  ): Promise<{ message: string }> {
    return this.usersService.updateMe(req.user.id, updateMeDto);
  }
}
