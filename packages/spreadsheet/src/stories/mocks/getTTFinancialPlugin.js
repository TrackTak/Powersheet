import {
  CellError,
  ErrorType,
  FunctionPlugin,
  InvalidArgumentsError,
  SimpleRangeValue
} from '@tracktak/hyperformula'
// @ts-ignore
import { ArraySize } from '@tracktak/hyperformula/es/ArraySize'
import { ErrorMessage } from '@tracktak/hyperformula/es/error-message'
import dayjs from 'dayjs'
import { isNil } from 'lodash'
import {
  balanceSheet,
  cashFlowStatement,
  dateFormat,
  getDatesFromStatements,
  getStatements,
  incomeStatement
} from './financialStatements'
import isBetween from 'dayjs/plugin/isBetween'

dayjs.extend(isBetween)

const defaultStatement = { ttm: {}, yearly: {} }

export const getTTFinancialPlugin = financialData => {
  const hasFinancialsLoaded = !!financialData
  const {
    financialStatements = {},
    currentEquityRiskPremium,
    currentIndustry,
    general,
    highlights,
    ...data
  } = financialData ?? {}
  const {
    incomeStatements = defaultStatement,
    balanceSheets = defaultStatement,
    cashFlowStatements = defaultStatement
  } = financialStatements

  const dates = getDatesFromStatements(incomeStatements)

  const statements = [
    [null, ...dates],
    ['Income Statement'],
    ...getStatements(incomeStatements, incomeStatement),
    [''],
    ['Balance Sheet'],
    ...getStatements(balanceSheets, balanceSheet),
    [''],
    ['Cash Flow Statement'],
    ...getStatements(cashFlowStatements, cashFlowStatement)
  ]

  const ttmData = {
    ...incomeStatements.ttm,
    ...balanceSheets.ttm,
    ...cashFlowStatements.ttm,
    ...currentEquityRiskPremium,
    ...currentIndustry,
    ...general,
    ...highlights,
    ...data
  }

  const historicalDataArrays = {
    incomeStatements: {
      yearly: Object.values(incomeStatements.yearly ?? {})
    },
    balanceSheets: {
      yearly: Object.values(balanceSheets.yearly ?? {})
    },
    cashFlowStatements: {
      yearly: Object.values(cashFlowStatements.yearly ?? {})
    }
  }

  const getTypeOfStatementToUse = attribute => {
    if (!isNil(incomeStatements.ttm[attribute])) {
      return 'incomeStatements'
    }

    if (!isNil(balanceSheets.ttm[attribute])) {
      return 'balanceSheets'
    }

    if (!isNil(cashFlowStatements.ttm[attribute])) {
      return 'cashFlowStatements'
    }
  }

  const getYearlyValues = (attribute, statementType, startDate, endDate) => {
    const startDateDayjs = dayjs(startDate)
    const endDateDayjs = dayjs(endDate)

    return historicalDataArrays[statementType].yearly
      .filter(({ date }) => {
        return dayjs(date).isBetween(startDateDayjs, endDateDayjs, 'day', '[]')
      })
      .map(datum => {
        let value = datum[attribute]

        if (attribute === 'date') {
          value = dayjs(value).format(dateFormat)
        }

        return value
      })
  }

  // Pre-fixed with TT due to there already being a FinancialPlugin
  // in hyperformula
  class TTFinancialPlugin extends FunctionPlugin {
    financial({ args }) {
      if (!args.length) {
        return new InvalidArgumentsError(1)
      }
      if (!hasFinancialsLoaded) {
        return new CellError(ErrorType.LOADING, ErrorMessage.FunctionLoading)
      }
      const attribute = args[0].value
      // TODO: Add proper error checking here later
      if (args.length === 1) {
        if (attribute === 'financialStatements') {
          return SimpleRangeValue.onlyValues(statements)
        }
        return ttmData[attribute] ?? ''
      }
      const startDate = args[1].value
      const statementType = getTypeOfStatementToUse(attribute)
      if (args.length === 2) {
        if (attribute === 'description') {
          return ttmData[attribute]
        }
        return (
          historicalDataArrays[statementType].yearly[startDate][attribute] ?? ''
        )
      }
      const endDate = args[2].value
      if (args.length === 3) {
        return SimpleRangeValue.onlyValues([
          getYearlyValues(attribute, statementType, startDate, endDate)
        ])
      }
    }
    financialSize({ args }) {
      if (!hasFinancialsLoaded) {
        return ArraySize.scalar()
      }

      const attribute = args[0].value
      const statementType = getTypeOfStatementToUse(attribute)
      const startDate = args[1] ? args[1].value : null
      const endDate = args[2] ? args[2].value : null

      if (attribute === 'financialStatements') {
        return ArraySize.fromArray(statements)
      }

      if (args.length === 3) {
        const yearlyValues = getYearlyValues(
          attribute,
          statementType,
          startDate,
          endDate
        )

        return ArraySize.fromArray([yearlyValues])
      }

      return ArraySize.scalar()
    }
  }

  TTFinancialPlugin.implementedFunctions = {
    FINANCIAL: {
      method: 'financial',
      arraySizeMethod: 'financialSize'
    }
  }

  TTFinancialPlugin.aliases = {
    FIN: 'FINANCIAL'
  }

  return TTFinancialPlugin
}

export const finTranslations = {
  enGB: {
    FIN: 'FIN'
  }
}
