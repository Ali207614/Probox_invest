import { IsArray, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum TransactionType {
  REINVEST = 'reinvest',
  DIVIDEND = 'dividend',
  INITIAL_CAPITAL = 'initial_capital',
  ADDITIONAL_CAPITAL = 'additional_capital',
  OTHER = 'other',
}

export enum TransactionDirection {
  INCOME = 'income',
  OUTCOME = 'outcome',
}

export class InvestorTransactionsFilterDto {
  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ required: false, enum: TransactionType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TransactionType, { each: true })
  @Transform(({ value }: { value: string | TransactionType[] }): string[] => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value as string[];
  })
  types?: TransactionType[];

  @ApiProperty({ required: false, enum: TransactionDirection })
  @IsOptional()
  @IsEnum(TransactionDirection)
  direction?: TransactionDirection;
}
