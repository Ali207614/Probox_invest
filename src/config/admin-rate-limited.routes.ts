import { RequestMethod } from '@nestjs/common';

export const RateLimitedAdminRoutes = [
  { path: 'users/', method: RequestMethod.GET },
  { path: 'users/:id', method: RequestMethod.GET },
  { path: 'users/', method: RequestMethod.POST },
  { path: 'users/:id', method: RequestMethod.PATCH },
  { path: 'users/:id', method: RequestMethod.DELETE },

  { path: 'permissions/', method: RequestMethod.GET },
];
