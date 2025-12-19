import { Injectable, NestMiddleware, RequestMethod } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FeatureService } from 'src/feature/feature.service';
import { MaintenanceExcludedRoutes } from 'src/config/maintenance-excluded.routes';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly featureService: FeatureService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const start: number = Date.now();
      const isOperational: boolean =
        await this.featureService.isFeatureActive('system.operational');
      const duration: number = Date.now() - start;
      console.log(`🛠 isMaintenance: ${isOperational} (${duration}ms)`);

      if (isOperational) return next();

      const rawPath: string = req.originalUrl || req.url || req.path;
      const reqPath: string = rawPath.split('?')[0].replace(/\/+$/, '');
      const reqMethod: string = req.method.toUpperCase();

      const isExcluded: boolean = MaintenanceExcludedRoutes.some((route) => {
        const routeBase: string = route.path.split('/:')[0]; // `/booking/date`
        const methodMatches: boolean = reqMethod === RequestMethod[route.method];
        const pathMatches: boolean = reqPath.startsWith(`/${routeBase}`);
        return methodMatches && pathMatches;
      });

      console.log(`🔍 isExcluded: ${isExcluded}`);

      if (isExcluded) return next();

      return res.status(503).json({
        message: '🛠 Texnik ishlar ketmoqda. Iltimos, keyinroq urinib ko‘ring.',
        location: 'maintenance_mode',
      });
    } catch (e) {
      console.error('❌ MaintenanceMiddleware error:', e);
      return next();
    }
  }
}
