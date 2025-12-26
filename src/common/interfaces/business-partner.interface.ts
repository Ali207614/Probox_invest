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
