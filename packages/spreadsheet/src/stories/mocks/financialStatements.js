import { sentenceCase } from 'change-case';
import dayjs from 'dayjs';

export const incomeStatement = [
  'revenue',
  'costOfRevenue',
  'grossProfit',
  'grossMargin',
  '',
  'sellingGeneralAdministrative',
  'sellingAndMarketingExpenses',
  'researchDevelopment',
  'effectOfAccountingCharges',
  'operatingExpenses',
  'operatingIncome',
  'operatingMargin',
  '',
  'interestIncome',
  'interestExpense',
  'netInterestIncome',
  'otherIncomeExpense',
  'incomeBeforeTax',
  '',
  'incomeTaxExpense',
  'effectiveTaxRate',
  'discontinuedOperations',
  'minorityInterest',
  'netIncomeFromContinuingOps',
  'netIncome',
  'preferredStockAndOtherAdjustments',
  'netIncomeApplicableToCommonShares',
  'netMargin',
  '',
  'ebit',
  'depreciationAndAmortization',
  'nonRecurring',
  'reconciledDepreciation',
  'otherItems',
  'ebitda',
];

export const balanceSheet = [
  'cash',
  'shortTermInvestments',
  'cashAndShortTermInvestments',
  'netReceivables',
  'inventory',
  'otherCurrentAssets',
  'totalCurrentAssets',
  'longTermInvestments',
  'propertyPlantEquipment',
  'intangibleAssets',
  'goodWill',
  'otherAssets',
  'nonCurrentAssetsTotal',
  'totalAssets',
  'accountsPayable',
  'shortLongTermDebt',
  'otherCurrentLiab',
  'totalCurrentLiabilities',
  'longTermDebt',
  'capitalLeaseObligations',
  'longTermDebtAndCapitalLeases',
  'deferredLongTermLiab',
  'nonCurrentLiabilitiesOther',
  'nonCurrentLiabilitiesTotal',
  'totalLiab',
  'commonStock',
  'preferredStockTotalEquity',
  'retainedEarnings',
  'accumulatedOtherComprehensiveIncome',
  'additionalPaidInCapital',
  'treasuryStock',
  'capitalSurpluse',
  'otherStockholderEquity',
  'totalStockholderEquity',
  'minorityInterest',
  'totalEquity',
];

export const cashFlowStatement = [
  'netIncome',
  'depreciation',
  'changeToAccountReceivables',
  'changeReceivables',
  'changeToInventory',
  'changeToLiabilities',
  'changeInWorkingCapital',
  'totalCashFromOperatingActivities',
  'investments',
  'otherCashflowsFromInvestingActivities',
  'totalCashflowsFromInvestingActivities',
  'salePurchaseOfStock',
  'netBorrowings',
  'dividendsPaid',
  'otherCashflowsFromFinancingActivities',
  'totalCashFromFinancingActivities',
  'beginPeriodCashFlow',
  'endPeriodCashFlow',
  'changeInCash',
  'capitalExpenditures',
  'freeCashFlow',
];

export const riskPremiumsAndBetas = [
  'unleveredBeta',
  'equityLeveredBeta',
  'riskFreeRate',
  'equityRiskPremium',
  'adjDefaultSpread',
  'matureMarketEquityRiskPremium',
];

export const general = [
  'description',
  'currencyCode',
  'code',
  'exchange',
  'name',
  'price',
  'sharesOutstanding',
  'industryName',
];

export const other = [
  'bookValueOfEquity',
  'bookValueOfDebt',
  'investedCapital',
  'salesToCapitalRatio',
  'marginalTaxRate',
  'standardDeviationInStockPrices',
  'marketCapitalization',
  'pastThreeYearsAverageEffectiveTaxRate',
  'costOfCapital',
  'afterTaxROIC',
  'preTaxOperatingMarginUnadjusted',
  'annualAverageCAGRLastFiveYears',
];

export const incomeStatementAttributes = incomeStatement
  .filter((element) => element)
  .map((attribute) => {
    return `"${attribute}"`;
  });

export const balanceSheetAttributes = balanceSheet
  .filter((element) => element)
  .map((attribute) => {
    return `"${attribute}"`;
  });

export const cashFlowStatementAttributes = cashFlowStatement
  .filter((element) => element)
  .map((attribute) => {
    return `"${attribute}"`;
  });

export const riskPremiumsAndBetasAttributes = riskPremiumsAndBetas.map(
  (attribute) => {
    return `"${attribute}"`;
  }
);

export const generalAttributes = general.map((attribute) => {
  return `"${attribute}"`;
});

export const otherAttributes = other.map((attribute) => {
  return `"${attribute}"`;
});

export const getStatements = (statements, statementKeys) => {
  const { date, filingDate, currencyCode, ...statement } = {
    ...statements.ttm,
  };

  const values = statementKeys.map((key) => {
    if (!key) return [''];

    const formattedKey = sentenceCase(key);
    const values = [];

    values.push(statement[key]);

    Object.keys(statements.yearly).forEach((yearlyDate) => {
      const statement = statements.yearly[yearlyDate];

      values.push(statement[key]);
    });

    return [formattedKey, ...values];
  });

  return values;
};

export const dateFormat = 'MMM YY';

export const getDatesFromStatements = (statement) => {
  const dates = Object.keys(statement.yearly).map((date) =>
    dayjs(date).format(dateFormat)
  );

  dates.unshift('TTM');

  return dates;
};
