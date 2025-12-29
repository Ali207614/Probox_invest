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
import { SmsDto } from './dto/sms.dto';
import { VerifyDto } from './dto/verify.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.type';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { SendCodeRateLimitGuard } from '../common/guards/send-code-rate-limit.guard';
import { SendCodeResponse } from '../common/types/send-code.type';

@ApiTags('Auth-admin')
@Controller('auth/users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  @UseGuards(SendCodeRateLimitGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Send verification code to phone number' })
  @ApiResponse({ status: 200, description: 'Verification code sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  sendCode(@Body() dto: SmsDto): Promise<SendCodeResponse> {
    return this.authService.sendVerificationCode(dto);
  }

  @Post('verify-code')
  @ApiOperation({ summary: 'Verify the received code' })
  @ApiResponse({ status: 200, description: 'Code verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  verifyCode(@Body() dto: VerifyDto): Promise<{ message: string }> {
    return this.authService.verifyCode(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Complete registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  completeRegister(@Body() dto: RegisterDto): Promise<{ access_token: string }> {
    return this.authService.completeRegistration(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive access token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset code' })
  @ApiResponse({ status: 200, description: 'Reset code sent' })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string; code: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using reset code' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtUserAuthGuard)
  @ApiOperation({ summary: 'Logout current admin' })
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
