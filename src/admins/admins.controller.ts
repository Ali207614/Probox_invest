import { Controller, Get, UseGuards, Query, Post } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationResult } from 'src/common/utils/pagination.util';
import type { Admin } from 'src/common/interfaces/admin.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import type { IUser } from 'src/common/interfaces/user.interface';

@ApiTags('Admins')
@ApiBearerAuth()
@Controller('admins')
@UseGuards(JwtUserAuthGuard, RolesGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all admins (Super admin only)' })
  async getAdmins(
    @Query('offset') offset = 0,
    @Query('limit') limit = 10,
    @CurrentUser() user: UserPayload,
  ): Promise<PaginationResult<Admin>> {
    return this.adminsService.getAdmins(user.id, Number(offset), Number(limit));
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create admin (Super admin only)' })
  async updateUser(user: IUser): Promise<IUser> {
    return this.adminsService.updateUser(user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create admin (Super admin only)' })
  async createAdmin(admin: Admin, @CurrentUser() user: UserPayload): Promise<Admin> {
    return this.adminsService.createAdmin(admin, user.id);
  }
}
