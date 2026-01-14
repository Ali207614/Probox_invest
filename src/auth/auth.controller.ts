import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendCodeResponseDto, SmsDto } from './dto/sms.dto';
import { VerifyDto } from './dto/verify.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { SendCodeResponse } from '../common/types/send-code.type';
import { MessageResponseDto } from './dto/message.response.dto';
import { TokenResponseDto } from './dto/token.response.dto';

@ApiTags('Auth-admin')
@Controller('auth/users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send verification code to phone number' })
  @ApiOkResponse({ type: SendCodeResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  sendCode(@Body() dto: SmsDto): Promise<SendCodeResponse> {
    return this.authService.sendVerificationCode(dto);
  }

  @Post('verify-code')
  @ApiOperation({ summary: 'Verify the received code' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  @HttpCode(200)
  verifyCode(@Body() dto: VerifyDto): Promise<{ message: string }> {
    return this.authService.verifyCode(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Complete registration' })
  @ApiResponse({ status: 200, description: 'User registered successfully' })
  @ApiCreatedResponse({ type: TokenResponseDto })
  @HttpCode(200)
  completeRegister(@Body() dto: RegisterDto): Promise<{ access_token: string }> {
    return this.authService.completeRegistration(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive access token' })
  @ApiOkResponse({ type: TokenResponseDto })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.login(dto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login and receive access token' })
  @ApiOkResponse({ type: TokenResponseDto })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  adminLogin(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.adminLogin(dto);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send verification code to phone number' })
  @ApiOkResponse({ type: SendCodeResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<SendCodeResponse> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using reset code' })
  @ApiOkResponse({ type: MessageResponseDto })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({ summary: 'Logout current admin' })
  @ApiOkResponse({ type: MessageResponseDto })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout(
    @CurrentUser() user: UserPayload,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const authHeader: string | undefined = req.headers['authorization'];
    const token: string | undefined = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    return this.authService.logout(user.id, token);
  }
}
