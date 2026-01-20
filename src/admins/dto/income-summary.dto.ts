import { ApiProperty } from '@nestjs/swagger';

// ==================== Response DTOs ====================

export class IncomeSummaryResponseDto {
  @ApiProperty({
    description: 'Current account balance',
    example: 15000000,
  })
  balance: number | string;

  @ApiProperty({
    description: 'Income received this month',
    example: 500000,
  })
  income_this_month: number | string;

  @ApiProperty({
    description: 'Income received last month',
    example: 450000,
  })
  income_last_month: number | string;

  @ApiProperty({
    description: 'Percentage growth compared to last month',
    example: 11.11,
    nullable: true,
  })
  income_growth_percent: number | string | null;
}
