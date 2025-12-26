import { RequestMethod } from '@nestjs/common';

export const RateLimitedUserRoutes = [
  { path: 'users/me/income-summary', method: RequestMethod.GET },
  { path: 'features', method: RequestMethod.GET },
  { path: 'auth/login', method: RequestMethod.POST },
  { path: 'auth/register', method: RequestMethod.POST },
];
