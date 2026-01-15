import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { PaginationResult } from '../utils/pagination.util';

@Injectable()
export class PaginationInterceptor<T> implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: PaginationResult<T>) => {
        if (data && Array.isArray(data.rows) && typeof data.total === 'number') {
          const { rows, ...meta } = data;
          return {
            meta,
            data: rows,
          };
        }
        return data;
      }),
    );
  }
}
