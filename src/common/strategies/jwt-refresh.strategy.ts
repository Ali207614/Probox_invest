import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtRefreshPayload {
  id: string;
  phone_main: string;
  sap_card_code: string;
  type: 'refresh';
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const secret: string | undefined = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtRefreshPayload): JwtRefreshPayload | null {
    // Only accept refresh tokens (type === 'refresh')
    if (payload.type !== 'refresh') {
      return null;
    }

    return {
      id: payload.id,
      sap_card_code: payload.sap_card_code,
      phone_main: payload.phone_main,
      type: payload.type,
    };
  }
}
