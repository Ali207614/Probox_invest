import { RequestMethod } from '@nestjs/common';

export const PublicRoutes = [
  { path: 'auth/users/login', method: RequestMethod.POST },
  { path: 'auth/users/register', method: RequestMethod.POST },
  { path: 'auth/users/send-code', method: RequestMethod.POST },
  { path: 'auth/users/verify-code', method: RequestMethod.POST },
  { path: 'auth/users/forgot-password', method: RequestMethod.POST },
  { path: 'auth/users/reset-password', method: RequestMethod.POST },
  // Features
  { path: 'features', method: RequestMethod.GET },
  { path: 'features/:key', method: RequestMethod.GET },
];
