//@ts-ignore
import {
  incomeStatementAttributes,
  balanceSheetAttributes,
  cashFlowStatementAttributes,
  riskPremiumsAndBetasAttributes,
  generalAttributes,
  otherAttributes,
} from './financialStatements';

export const functionHelperData = {
  header: 'FINANCIAL - FIN',
  headerDescription:
    'Fetches current or historical securities information from Tracktak Finance.',
  codeSyntaxUsage: [
    '=FIN("revenue")',
    '=FIN("revenue",,"01/01/2000")',
    '=FIN("B2, B3")',
  ],
  codeSyntaxElements: [
    {
      codeSyntax: '=FIN(attribute, [startDate], [endDate])',
      values: [
        {
          syntaxName: '[]',
          description:
            'indicates optional. If a parameter is optional it can be skipped with a comma. Example: =FIN("revenue",,"01/01/2021")',
        },
        {
          syntaxName: 'attribute',
          description:
            '1st argument is required. Fetches current or historical securities information from Tracktak.',
        },
        {
          syntaxName: '[startDate]',
          description:
            '2nd argument is optional. The start date when fetching historical data.',
        },
        {
          syntaxName: '[endDate]',
          description:
            '3rd argument is optional. The end date when fetching historical data.',
        },
        {
          syntaxName: '[mm/dd/yyy]',
          description: 'The start date and end date format.',
        },
      ],
    },
  ],
  attributes: [
    {
      header: 'Income Statement',
      attributeNames: incomeStatementAttributes,
    },
    {
      header: 'Balance Sheet',
      attributeNames: balanceSheetAttributes,
    },
    {
      header: 'Cashflow Statement',
      attributeNames: cashFlowStatementAttributes,
    },
    {
      header: 'Risk Premiums and Betas',
      attributeNames: riskPremiumsAndBetasAttributes,
    },
    {
      header: 'General',
      attributeNames: generalAttributes,
    },
    {
      header: 'Other',
      attributeNames: otherAttributes,
    },
  ],
};
