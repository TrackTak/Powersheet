import { groupBy } from 'lodash'
import { IFunctionHelperData } from './FunctionHelper'
import powersheetFormulaMetadataJSON from './powersheetFormulaMetadata.json'

export const functionMetadata: Record<string, IFunctionHelperData> = {
  ...powersheetFormulaMetadataJSON,
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
    attributes: [],
    type: 'Stock'
  }
}

export const functionMetadataByGroup = groupBy(functionMetadata, 'type')
