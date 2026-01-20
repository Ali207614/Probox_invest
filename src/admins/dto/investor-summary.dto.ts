import { ApiProperty } from '@nestjs/swagger';

// ==================== Response Sub-DTOs ====================

export class InvestorSummaryMetaDto {
  @ApiProperty({
    description: 'Total number of metric items',
    example: 4,
  })
  total: number;

  @ApiProperty({
    description: 'Maximum records returned',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Number of records skipped',
    example: 0,
  })
  offset: number;
}

export class InvestorMetricItemTotalOnlyDto {
  @ApiProperty({
    description: 'Metric identifier key',
    enum: ['initial_capital', 'additional_capital'],
    example: 'initial_capital',
  })
  key: 'initial_capital' | 'additional_capital';

  @ApiProperty({
    description: 'Metric type (total only, no monthly breakdown)',
    enum: ['total_only'],
    example: 'total_only',
  })
  type: 'total_only';

  @ApiProperty({
    description: 'Total amount for this metric',
    example: 50000000,
  })
  total: number;
}

export class InvestorMetricItemMonthlyDto {
  @ApiProperty({
    description: 'Metric identifier key',
    enum: ['reinvest', 'dividend'],
    example: 'dividend',
  })
  key: 'reinvest' | 'dividend';

  @ApiProperty({
    description: 'Metric type (includes monthly breakdown)',
    enum: ['monthly'],
    example: 'monthly',
  })
  type: 'monthly';

  @ApiProperty({
    description: 'Total amount for this metric',
    example: 5000000,
  })
  total: number;

  @ApiProperty({
    description: 'Amount for the current month',
    example: 500000,
  })
  this_month: number;

  @ApiProperty({
    description: 'Amount for last month',
    example: 450000,
  })
  last_month: number;

  @ApiProperty({
    description: 'Growth percentage compared to last month',
    example: 11.11,
    nullable: true,
  })
  growth_percent: number | null;
}

// ==================== Response DTO ====================

export class InvestorSummaryResponseDto {
  @ApiProperty({
    description: 'Pagination metadata',
    type: InvestorSummaryMetaDto,
  })
  meta: InvestorSummaryMetaDto;

  @ApiProperty({
    description: 'Array of investor metric items',
    type: 'array',
    items: {
      oneOf: [
        { $ref: '#/components/schemas/InvestorMetricItemTotalOnlyDto' },
        { $ref: '#/components/schemas/InvestorMetricItemMonthlyDto' },
      ],
    },
    example: [
      { key: 'initial_capital', type: 'total_only', total: 50000000 },
      { key: 'additional_capital', type: 'total_only', total: 10000000 },
      {
        key: 'reinvest',
        type: 'monthly',
        total: 3000000,
        this_month: 300000,
        last_month: 250000,
        growth_percent: 20.0,
      },
      {
        key: 'dividend',
        type: 'monthly',
        total: 5000000,
        this_month: 500000,
        last_month: 450000,
        growth_percent: 11.11,
      },
    ],
  })
  data: (InvestorMetricItemTotalOnlyDto | InvestorMetricItemMonthlyDto)[];
}
