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
  ApiOkResponse,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
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
  @ApiOperation({
    summary: 'Send verification code to phone number',
    description:
      'Sends a 6-digit verification code via SMS to the provided Uzbekistan phone number. The code expires after 5 minutes (300 seconds). Rate limiting applies - you must wait 60 seconds between code requests.',
  })
  @ApiBody({
    type: SmsDto,
    description: 'Phone number and language preference for SMS',
    examples: {
      uzbek: {
        summary: 'Uzbek language',
        value: { phone_main: '+998901234567', language: 'uz' },
      },
      russian: {
        summary: 'Russian language',
        value: { phone_main: '+998901234567', language: 'ru' },
      },
    },
  })
  @ApiOkResponse({
    type: SendCodeResponseDto,
    description: 'Verification code sent successfully',
    example: {
      message: 'Verification code sent successfully',
      data: {
        expires_in: 300,
        expires_at: '2025-12-29T12:40:00.000Z',
        retry_after: 60,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid phone number format or language',
    example: {
      statusCode: 400,
      message: ['Invalid phone number format', 'language must be one of: uz, ru'],
      error: 'Bad Request',
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded - must wait before requesting another code',
    example: {
      statusCode: 429,
      message: 'Please wait 45 seconds before requesting another code',
      error: 'Too Many Requests',
    },
  })
  sendCode(@Body() dto: SmsDto): Promise<SendCodeResponse> {
    return this.authService.sendVerificationCode(dto);
  }

  @Post('verify-code')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify the received code',
    description:
      'Verifies the 6-digit code sent to the phone number via SMS. The code must be verified before it expires (5 minutes from sending). Upon successful verification, the phone number is marked as verified for registration.',
  })
  @ApiBody({
    type: VerifyDto,
    description: 'Phone number and verification code',
    examples: {
      example: {
        summary: 'Verify code example',
        value: { phone_main: '+998901234567', code: '789034' },
      },
    },
  })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Code verified successfully',
    example: { message: 'Code verified successfully' },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification code',
    examples: {
      invalidCode: {
        summary: 'Invalid code',
        value: {
          statusCode: 400,
          message: 'Invalid verification code',
          error: 'Bad Request',
        },
      },
      expiredCode: {
        summary: 'Expired code',
        value: {
          statusCode: 400,
          message: 'Verification code has expired',
          error: 'Bad Request',
        },
      },
      invalidFormat: {
        summary: 'Invalid format',
        value: {
          statusCode: 400,
          message: ['code must be a string', 'Invalid phone number format'],
          error: 'Bad Request',
        },
      },
    },
  })
  verifyCode(@Body() dto: VerifyDto): Promise<{ message: string }> {
    return this.authService.verifyCode(dto);
  }

  @Post('register')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Complete registration',
    description:
      'Completes user registration after phone verification. Requires a verified phone number, matching passwords (4-20 characters), and a device FCM token for push notifications. Returns a JWT access token upon successful registration.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Registration details including phone, password, and device token',
    examples: {
      example: {
        summary: 'Registration example',
        value: {
          phone_main: '+998901234567',
          password: 'securePass123',
          confirm_password: 'securePass123',
          device_token: 'fcm_device_token_here_abc123xyz',
        },
      },
    },
  })
  @ApiOkResponse({
    type: TokenResponseDto,
    description: 'User registered successfully',
    example: {
      access_token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or phone not verified',
    examples: {
      validationError: {
        summary: 'Validation error',
        value: {
          statusCode: 400,
          message: [
            'password must be longer than or equal to 4 characters',
            'Invalid phone number format',
          ],
          error: 'Bad Request',
        },
      },
      phoneNotVerified: {
        summary: 'Phone not verified',
        value: {
          statusCode: 400,
          message: 'Phone number not verified',
          error: 'Bad Request',
        },
      },
      passwordMismatch: {
        summary: 'Passwords do not match',
        value: {
          statusCode: 400,
          message: 'Passwords do not match',
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User already exists with this phone number',
    example: {
      statusCode: 409,
      message: 'User with this phone number already exists',
      error: 'Conflict',
    },
  })
  completeRegister(@Body() dto: RegisterDto): Promise<{ access_token: string }> {
    return this.authService.completeRegistration(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login and receive access token',
    description:
      'Authenticates a user with phone number and password. Returns a JWT access token valid for authenticated requests. The device token is used for push notification registration.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials',
    examples: {
      example: {
        summary: 'Login example',
        value: {
          phone_main: '+998901234567',
          password: 'securePass123',
          device_token: 'fcm_device_token_here_abc123xyz',
        },
      },
    },
  })
  @ApiOkResponse({
    type: TokenResponseDto,
    description: 'Login successful',
    example: {
      access_token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format',
    example: {
      statusCode: 400,
      message: ['Invalid phone number format', 'password must be a string'],
      error: 'Bad Request',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    example: {
      statusCode: 401,
      message: 'Invalid phone number or password',
      error: 'Unauthorized',
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    example: {
      statusCode: 404,
      message: 'User not found',
      error: 'Not Found',
    },
  })
  login(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.login(dto);
  }

  @Post('admin/login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin login and receive access token',
    description:
      'Authenticates an admin user with phone number and password. Only users with admin privileges can successfully authenticate through this endpoint. Returns a JWT access token for admin operations.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Admin login credentials',
    examples: {
      example: {
        summary: 'Admin login example',
        value: {
          phone_main: '+998901234567',
          password: 'adminSecurePass123',
          device_token: 'fcm_device_token_here_abc123xyz',
        },
      },
    },
  })
  @ApiOkResponse({
    type: TokenResponseDto,
    description: 'Admin login successful',
    example: {
      access_token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format',
    example: {
      statusCode: 400,
      message: ['Invalid phone number format', 'password must be a string'],
      error: 'Bad Request',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or insufficient permissions',
    examples: {
      invalidCredentials: {
        summary: 'Invalid credentials',
        value: {
          statusCode: 401,
          message: 'Invalid phone number or password',
          error: 'Unauthorized',
        },
      },
      notAdmin: {
        summary: 'Not an admin',
        value: {
          statusCode: 401,
          message: 'Access denied. Admin privileges required.',
          error: 'Unauthorized',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Admin user not found',
    example: {
      statusCode: 404,
      message: 'User not found',
      error: 'Not Found',
    },
  })
  adminLogin(@Body() dto: LoginDto): Promise<{ access_token: string }> {
    return this.authService.adminLogin(dto);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Send password reset code to phone number',
    description:
      'Initiates the password reset process by sending a verification code via SMS to the registered phone number. The code expires after 5 minutes and must be used with the reset-password endpoint.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Phone number for password reset',
    examples: {
      example: {
        summary: 'Forgot password example',
        value: { phone_main: '+998901234567' },
      },
    },
  })
  @ApiOkResponse({
    type: SendCodeResponseDto,
    description: 'Reset code sent successfully',
    example: {
      message: 'Verification code sent successfully',
      data: {
        expires_in: 300,
        expires_at: '2025-12-29T12:40:00.000Z',
        retry_after: 60,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid phone number format',
    example: {
      statusCode: 400,
      message: ['Invalid phone number format'],
      error: 'Bad Request',
    },
  })
  @ApiNotFoundResponse({
    description: 'User with this phone number not found',
    example: {
      statusCode: 404,
      message: 'User with this phone number not found',
      error: 'Not Found',
    },
  })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded - must wait before requesting another code',
    example: {
      statusCode: 429,
      message: 'Please wait 45 seconds before requesting another code',
      error: 'Too Many Requests',
    },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<SendCodeResponse> {
    return this.authService.forgotPassword(dto);
  }

  @Post('verify-reset-code')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify reset code',
    description:
      'Verifies the 6-digit code sent for password reset. If valid, returns a temporary reset token. This token must be included in the reset-password request.',
  })
  @ApiBody({
    type: VerifyDto,
    description: 'Phone number and reset code',
  })
  @ApiOkResponse({
    description: 'Code verified successfully',
    schema: {
      type: 'object',
      properties: {
        reset_token: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired code',
  })
  verifyResetCode(@Body() dto: VerifyDto): Promise<{ reset_token: string }> {
    return this.authService.verifyResetCode(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reset password using reset token',
    description:
      'Resets the user password using a valid reset token obtained from verify-reset-code. Requires the phone number, reset token, and matching new passwords.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Password reset details',
    examples: {
      example: {
        summary: 'Reset password example',
        value: {
          phone_main: '+998901234567',
          reset_token: '550e8400-e29b-41d4-a716-446655440000',
          new_password: 'newSecurePass123',
          confirm_new_password: 'newSecurePass123',
        },
      },
    },
  })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Password reset successful',
    example: { message: 'Password reset successful' },
  })
  @ApiBadRequestResponse({
    description: 'Invalid token, password mismatch, or validation error',
    examples: {
      invalidToken: {
        summary: 'Invalid reset token',
        value: {
          statusCode: 403,
          message: 'Invalid or expired reset session',
          error: 'Forbidden',
        },
      },
      expiredCode: {
        summary: 'Expired reset code',
        value: {
          statusCode: 400,
          message: 'Reset code has expired',
          error: 'Bad Request',
        },
      },
      passwordMismatch: {
        summary: 'Passwords do not match',
        value: {
          statusCode: 400,
          message: 'Passwords do not match',
          error: 'Bad Request',
        },
      },
      validationError: {
        summary: 'Validation error',
        value: {
          statusCode: 400,
          message: ['new_password must be longer than or equal to 4 characters'],
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    example: {
      statusCode: 404,
      message: 'User not found',
      error: 'Not Found',
    },
  })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Logout current user',
    description:
      'Invalidates the current JWT access token, effectively logging out the user. The token will be blacklisted and cannot be used for subsequent authenticated requests.',
  })
  @ApiOkResponse({
    type: MessageResponseDto,
    description: 'Logged out successfully',
    example: { message: 'Logged out successfully' },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing authentication token',
    examples: {
      missingToken: {
        summary: 'Missing token',
        value: {
          statusCode: 401,
          message: 'Token not found',
          error: 'Unauthorized',
        },
      },
      invalidToken: {
        summary: 'Invalid token',
        value: {
          statusCode: 401,
          message: 'Invalid or expired token',
          error: 'Unauthorized',
        },
      },
      blacklistedToken: {
        summary: 'Token already blacklisted',
        value: {
          statusCode: 401,
          message: 'Token has been revoked',
          error: 'Unauthorized',
        },
      },
    },
  })
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
