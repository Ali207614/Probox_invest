export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationResult<T> extends PaginationMeta {
  rows: T[];
  total_income?: number;
  total_outcome?: number;
}
