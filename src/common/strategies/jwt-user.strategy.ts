import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  id: string;
  phone_main: string;
  sap_card_code: string;
  roles: string[];
}
@Injectable()
export class JwtUserStrategy extends PassportStrategy(Strategy, 'jwt-user') {
  constructor(configService: ConfigService) {
    const secret: string | undefined = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET не задан в переменных окружения');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return {
      id: payload.id,
      sap_card_code: payload.sap_card_code,
      phone_main: payload.phone_main,
      roles: payload.roles || [],
    };
  }
}
