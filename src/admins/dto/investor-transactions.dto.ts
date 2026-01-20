import { ApiProperty } from '@nestjs/swagger';

// ==================== Response Sub-DTOs ====================

export class InvestorTransactionItemDto {
  @ApiProperty({
    description: 'Transaction reference date',
    example: '2026-01-15T10:00:00.000Z',
  })
  ref_date: string;

  @ApiProperty({
    description: 'Internal transaction ID',
    example: 12345,
  })
  trans_id: number;

  @ApiProperty({
    description: 'Transaction type code from SAP',
    example: 30,
  })
  trans_type: number;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Monthly dividend payment',
    nullable: true,
  })
  description: string | null;

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
