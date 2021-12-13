import { IFunctionHelperData } from './FunctionHelper'
import formulaMetadataJSON from './formulaMetadata.json'

export const functionMetadata: Record<string, IFunctionHelperData> = {
  ...formulaMetadataJSON,
  FIN: {
    header: 'FIN',
    headerDescription:
      'Fetches current or historical securities information from Tracktak Finance.',
    parameters: 'attribute, [startDate], [endDate]',
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
    attributes: []
  }
}
