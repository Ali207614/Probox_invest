import { ApiProperty } from '@nestjs/swagger';

// ==================== Response Sub-DTOs ====================

export class InvestorTransactionItemDto {
  @ApiProperty({
    description: 'Transaction reference date',
    example: '2026-01-15',
  })
  ref_date: string;

  @ApiProperty({
    description: 'Transaction amount in UZS',
    example: 500000,
  })
  amount: number;

  @ApiProperty({
    description: 'Categorized transaction type',
    enum: ['initial_capital', 'additional_capital', 'reinvest', 'dividend', 'other'],
    example: 'dividend',
  })
  transaction_type: 'initial_capital' | 'additional_capital' | 'reinvest' | 'dividend' | 'other';

  @ApiProperty({
    description: 'Number of aggregated SAP ledger rows',
    example: 1,
  })
  rows_count: number;

  @ApiProperty({
    description: 'Minimum internal transaction ID in this group',
    example: 12345,
  })
  min_trans_id: number;

  @ApiProperty({
    description: 'Maximum internal transaction ID in this group',
    example: 12345,
  })
  max_trans_id: number;
}

// ==================== Response DTO ====================

export class InvestorTransactionsPaginatedResponseDto {
  @ApiProperty({
    description: 'Array of transaction records',
    type: [InvestorTransactionItemDto],
  })
  rows: InvestorTransactionItemDto[];

  @ApiProperty({
    description: 'Total number of transactions matching the filter',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Maximum records returned per request',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Number of records skipped',
    example: 0,
  })
  offset: number;
}
