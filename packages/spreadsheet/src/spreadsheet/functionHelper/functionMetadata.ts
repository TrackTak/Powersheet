import { groupBy } from 'lodash'
import {
  incomeStatementAttributes,
  balanceSheetAttributes,
  cashFlowStatementAttributes,
  riskPremiumsAndBetasAttributes,
  generalAttributes,
  otherAttributes
} from './financialStatements'
import { IFunctionHelperData } from './FunctionHelper'
import powersheetFormulaMetadataJSON from './powersheetFormulaMetadata.json'

export const functionMetadata: Record<string, IFunctionHelperData> = {
  FIN: {
    header: 'FIN',
    headerDescription:
      'Fetches current or historical securities information from Tracktak Finance.',
    parameters: ['attribute', '[startDate]', '[endDate]'],
    codeSyntaxUsage: [
      '=FIN("revenue")',
      '=FIN("revenue",,"01/01/2000")',
      '=FIN(B2, B3)'
    ],
    codeSyntaxElements: [
      {
        codeSyntax: '=FIN(attribute, [startDate], [endDate])',
        values: []
      }
    ],
    type: 'Stock',
    attributes: [
      {
        header: 'Income Statement',
        attributeNames: incomeStatementAttributes
      },
      {
        header: 'Balance Sheet',
        attributeNames: balanceSheetAttributes
      },
      {
        header: 'Cashflow Statement',
        attributeNames: cashFlowStatementAttributes
      },
      {
        header: 'Risk Premiums and Betas',
        attributeNames: riskPremiumsAndBetasAttributes
      },
      {
        header: 'General',
        attributeNames: generalAttributes
      },
      {
        header: 'Other',
        attributeNames: otherAttributes
      }
    ]
  },
  ...powersheetFormulaMetadataJSON
}

export const functionMetadataByGroup = groupBy(functionMetadata, 'type')
