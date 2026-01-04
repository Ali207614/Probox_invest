export type InvestorMetricKey = 'initial_capital' | 'additional_capital' | 'reinvest' | 'dividend';

export type InvestorMetricType = 'total_only' | 'monthly';

export type InvestorMetricItem =
  | {
      key: Exclude<InvestorMetricKey, 'reinvest' | 'dividend'>;
      type: 'total_only';
      total: number;
    }
  | {
      key: 'reinvest' | 'dividend';
      type: 'monthly';
      total: number;
      this_month: number;
      last_month: number;
      growth_percent: number | null;
    };
