export interface IBusinessPartner {
  CardCode: string;
  CardName: string;
  CardType: string;
  Phone1?: string | null;
  Phone2?: string | null;
}

export interface IBpMonthlyIncomeSummary {
  Balance: number | string;
  IncomeThisMonth: number | string;
  IncomeLastMonth: number | string;
  IncomeGrowthPercent: number | string | null;
}

export interface InvestorIncomeSummary {
  initial_capital: number;
  additional_capital: number;
  reinvest_fund: number;
  dividend_paid: number;
}

export interface InvestorTransaction {
  ref_date: string;
  trans_id: number;
  trans_type: number;
  description: string | null;
  amount: number;
  transaction_type: 'initial_capital' | 'additional_capital' | 'reinvest' | 'dividend' | 'other';
}
