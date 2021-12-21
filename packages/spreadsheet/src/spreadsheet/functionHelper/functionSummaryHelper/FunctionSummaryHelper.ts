import { DelegateInstance, delegate } from 'tippy.js'
import './FunctionSummaryHelper.scss'
import {
  createCodeText,
  createHeader,
  createParagraph,
  createSyntaxListItem
} from '../functionHelperHtmlElementHelpers'
import {
  createMainHeader,
  createButton,
  createWrapperContent,
  functionSummaryHelperPrefix
} from './functionSummaryHtmlElementHelpers'
import Spreadsheet from '../../Spreadsheet'
import { functionMetadata } from '../functionMetadata'
import { IFunctionHelperData } from '../FunctionHelper'
import { IToken } from 'chevrotain'
import { last } from 'lodash'
import { getCaretPosition } from '../../utils'
// @ts-ignore
import { Ast } from '@tracktak/hyperformula/parser/Ast'

class FunctionSummaryHelper {
  functionSummaryHelperEl: HTMLDivElement
  functionSummaryHelperListContainerEl: HTMLDivElement
  expandIcon!: HTMLSpanElement
  accordionButton!: HTMLButtonElement
  helper: DelegateInstance
  textWrapper!: HTMLDivElement
  parameterSyntaxElements: HTMLSpanElement[]

  /**
   * @internal
   */
  constructor(private _spreadsheet: Spreadsheet) {
    const { functionSummaryHelperContainerEl, functionSummaryHelperEl } =
      createWrapperContent()
    this.functionSummaryHelperListContainerEl = functionSummaryHelperContainerEl
    this.functionSummaryHelperEl = functionSummaryHelperEl
    this.helper = delegate(functionSummaryHelperEl, {
      target: `${functionSummaryHelperPrefix}`,
      arrow: false,
      placement: 'bottom',
      theme: 'formula-helper',
      interactive: true,
      hideOnClick: false
    })
    this.parameterSyntaxElements = []
  }
  /**
   * Shows the function summary helper.
   *
   * @param functionName - The input function
   * @param inputParameters - The input parameters that have currently been typed by user
   */
  show(functionName: string) {
    const metadata = functionMetadata[functionName]
    if (metadata) {
      this._update(metadata)
      this.helper.show()
    }
  }

  updateParameterHighlights(text: string) {
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer
    const tokens = lexer.tokenizeFormula(text).tokens as IToken[]

    const leftParentheses = tokens.filter(
      x => x.tokenType.name === 'ProcedureName' || x.tokenType.name === 'LParen'
    )
    const rightParentheses = tokens.filter(x => x.tokenType.name === 'RParen')
    const missingRightParenthesesNumber =
      leftParentheses.length - rightParentheses.length

    let formula = text

    if (missingRightParenthesesNumber > 0) {
      for (let index = 0; index < missingRightParenthesesNumber; index++) {
        formula += ')'
      }
    }

    // TODO: Make extractTemporaryFormula public in HyperFormula
    const { ast } =
      // @ts-ignore
      this._spreadsheet.hyperformula.extractTemporaryFormula(
        formula,
        this._spreadsheet.sheets.activeSheetId
      )

    const parameters = ast.args as Ast[]
    // const formulaResult = lastTextChar ?

    // const caretPosition = getCaretPosition(
    //   this._spreadsheet.sheets.cellEditor.cellEditorEl
    // )
    // const precedingCaretPosition = caretPosition - 1
    // const tokens = this.syntaxLexer.lexer.tokenize(text).tokens
    // if (tokens[1]?.tokenType.name !== 'ProcedureName') {
    //   return
    // }
    // const parameters = []
    // let i = 0
    // let currentParameterString = ''
    // let isIteratingProcedure = false
    // // while (tokens.length !== 0) {
    // //   let currentToken = tokens[i]
    // //   if (currentToken.tokenType.name === 'ProcedureName') {
    // //     isIteratingProcedure = true
    // //   }
    // //   currentParameterString += currentToken.image
    // // }
    // tokens.forEach(token => {})
    // this.parameterSyntaxElements.forEach(element => {
    //   element.classList.remove(`${functionSummaryHelperPrefix}-highlight`)
    // })
    // // const eligibleTokensToHighlight = tokens.filter(token =>
    // //   syntaxTokenWhitelist.every(ch => !token.tokenType.name.includes(ch))
    // // )
    // // const tokenIndex = tokens.findIndex(token => {
    // //   const endOffset = token.endOffset! // ?? Number.MAX_VALUE
    // //   return (
    // //     (caretPosition >= token.startOffset && caretPosition <= endOffset) ||
    // //     (precedingCaretPosition >= token.startOffset &&
    // //       precedingCaretPosition <= endOffset)
    // //   )
    // // })
    // // const seperetorIndexes = parameterTokens
    // //   .map((token, i) => {
    // //     return token.tokenType.name !== 'ArrayColSep' &&
    // //       token.tokenType.name !== 'ArrayRowSep'
    // //       ? i
    // //       : null
    // //   })
    // //   .filter(x => x !== null) as number[]
    // const numberOfSeparators = tokens.reduce((prev, token) => {
    //   if (
    //     token.tokenType.name === 'ArrayColSep' ||
    //     token.tokenType.name === 'ArrayRowSep'
    //   ) {
    //     return (prev += 1)
    //   }
    //   return prev
    // }, 0)
    // let elementIndexToHighlight = numberOfSeparators
    // const lastToken = tokens[tokens.length - 1]
    // // Handles highlighting first parameter when no values supplied, i.e =SUM(
    // if (tokens.length === 0 && lastToken.endOffset === precedingCaretPosition) {
    //   elementIndexToHighlight = 0
    // }
    // const separators = tokens.filter(
    //   token => token.tokenType.name === 'ArrayColSep'
    // )
    // const precedingSeparatorIndex = separators.findIndex(
    //   token => token.endOffset === precedingCaretPosition
    // )
    // if (elementIndexToHighlight === -1) {
    //   // && precedingSeparatorIndex === -1) {
    //   return
    // }
    // // const isWithinInfiniteParameterSection =
    // //   this._isWithinInfiniteParameterSection(
    // //     eligibleTokensToHighlight,
    // //     caretPosition
    // //   )
    // // const isAfterSeparator =
    // //   caretElementIndex === -1 ||
    // //   (precedingSeparatorIndex !== -1 && !isWithinInfiniteParameterSection)
    // // if (isAfterSeparator) {
    // //   elementIndexToHighlight = precedingSeparatorIndex + 1
    // // }
    // const placeholderElementToHighlight = this._getElementToHighlight(
    //   precedingSeparatorIndex,
    //   elementIndexToHighlight,
    //   false // isWithinInfiniteParameterSection
    // )
    // placeholderElementToHighlight.classList.add(
    //   `${functionSummaryHelperPrefix}-highlight`
    // )
  }

  private _isWithinInfiniteParameterSection(
    tokens: IToken[],
    currentCaretPosition: number
  ) {
    const tokenBeforeInfiniteParameterPosition =
      tokens[this.parameterSyntaxElements.length - 1]?.startOffset
    return !!(
      last(this.parameterSyntaxElements)?.dataset.isInfiniteParameter &&
      currentCaretPosition >= tokenBeforeInfiniteParameterPosition
    )
  }

  private _getElementToHighlight(
    precedingSeparatorIndex: number,
    elementIndexToHighlight: number,
    isWithinInfiniteParameterSection: boolean
  ) {
    // const shouldHighlightLastElement =
    //   (precedingSeparatorIndex ||
    //     elementIndexToHighlight >= this.placeholderParameters?.length) &&
    //   isWithinInfiniteParameterSection

    // return shouldHighlightLastElement
    //   ? last(this.placeholderParameters)?.element
    //   : this.placeholderParameters[elementIndexToHighlight]?.element

    return this.parameterSyntaxElements[elementIndexToHighlight]
  }

  private _update(formulaMetadata: IFunctionHelperData) {
    this.functionSummaryHelperListContainerEl = document.createElement('div')
    this.functionSummaryHelperListContainerEl.classList.add(
      `${functionSummaryHelperPrefix}`
    )

    this.expandIcon = document.createElement('span')
    this.expandIcon.classList.add(`${functionSummaryHelperPrefix}-expand-icon`)

    this.accordionButton = document.createElement('button')
    this.accordionButton.classList.add(
      `${functionSummaryHelperPrefix}-accordion-button`
    )

    this.accordionButton.addEventListener('click', this._toggleAccordion)
    this.accordionButton.append(this.expandIcon)
    this.functionSummaryHelperListContainerEl.appendChild(this.accordionButton)

    this.textWrapper = document.createElement('div')
    this.textWrapper.classList.add(
      `${functionSummaryHelperPrefix}-text-wrapper`
    )

    const { mainHeaderEl, parameterSyntaxElements } = createMainHeader(
      formulaMetadata.header,
      formulaMetadata.parameters
    )
    this.parameterSyntaxElements = parameterSyntaxElements

    const { paragraphEl: description } = createParagraph(
      formulaMetadata.headerDescription
    )

    const { header: headerUsage } = createHeader('Sample Usage')
    const { header: headerSyntax } = createHeader('Syntax')

    const { button: learnMoreButton } = createButton('Learn more')
    learnMoreButton.addEventListener('click', () => {
      this._spreadsheet.options.showFunctionHelper = true

      this._spreadsheet.render()
    })
    this.functionSummaryHelperListContainerEl.appendChild(mainHeaderEl)
    this.functionSummaryHelperListContainerEl.appendChild(this.textWrapper)
    this.textWrapper.appendChild(description)

    if (formulaMetadata.codeSyntaxUsage.length) {
      this.textWrapper.appendChild(headerUsage)
    }

    formulaMetadata.codeSyntaxUsage.forEach(usageName => {
      const { codeEl } = createCodeText(usageName)
      this.textWrapper.appendChild(codeEl)
    })

    this.textWrapper.appendChild(headerSyntax)

    formulaMetadata.codeSyntaxElements.forEach(({ codeSyntax, values }) => {
      const codeSyntaxList = document.createElement('ul')
      const { codeEl } = createCodeText(codeSyntax)

      this.textWrapper.appendChild(codeEl)
      this.textWrapper.appendChild(codeSyntaxList)

      values.forEach(({ syntaxName, description }) => {
        const { listItem } = createSyntaxListItem(syntaxName, description)
        codeSyntaxList.appendChild(listItem)
      })
    })

    this.textWrapper.appendChild(learnMoreButton)

    this.helper.setContent(this.functionSummaryHelperListContainerEl)
  }

  private _toggleAccordion = () => {
    if (
      this.textWrapper.classList.contains(
        `${functionSummaryHelperPrefix}-expanded`
      )
    ) {
      this.expandIcon.classList.remove(
        `${functionSummaryHelperPrefix}-collapse-icon`
      )
      this.textWrapper.classList.remove(
        `${functionSummaryHelperPrefix}-expanded`
      )
    } else {
      this.expandIcon.classList.add(
        `${functionSummaryHelperPrefix}-collapse-icon`
      )
      this.textWrapper.classList.add(`${functionSummaryHelperPrefix}-expanded`)
    }
  }

  /**
   * Hide the function summary helper
   */
  hide() {
    this.helper.hide()
  }

  /**
   * @internal
   */
  _destroy() {
    this.helper.destroy()
    this.functionSummaryHelperEl.remove()
  }
}

export default FunctionSummaryHelper
