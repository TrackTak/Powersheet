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
  functionSummaryHelperPrefix,
  IParameterSyntaxElement
} from './functionSummaryHtmlElementHelpers'
import Spreadsheet from '../../Spreadsheet'
import { functionMetadata } from '../functionMetadata'
import { IFunctionHelperData } from '../FunctionHelper'
import { PLACEHOLDER_WHITELIST } from '../../sheets/cellEditor/CellEditor'
import { IToken } from 'chevrotain'
import { last } from 'lodash'
import { getCaretPosition } from '../../utils'
import { Ast } from '@tracktak/hyperformula/typings/parser'

class FunctionSummaryHelper {
  functionSummaryHelperEl: HTMLDivElement
  functionSummaryHelperListContainerEl: HTMLDivElement
  expandIcon!: HTMLSpanElement
  accordionButton!: HTMLButtonElement
  helper: DelegateInstance
  textWrapper!: HTMLDivElement
  parameterSyntaxElements: IParameterSyntaxElement[]

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
    // tokens = tokens.filter(x => x.tokenType.name !== 'WhiteSpace')
    // const updatedText = tokens.map(token => token.image).join('')
    const formula = this._getFormulaText(text)
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer
    const tokens = lexer.tokenizeFormula(text).tokens as IToken[]
    const { ast } =
      // @ts-ignore
      this._spreadsheet.hyperformula.extractTemporaryFormula(
        formula,
        this._spreadsheet.sheets.activeSheetId
      )

    if (!ast?.args) return

    const parameters = ast.args as IToken[]

    const caretPosition = getCaretPosition(
      this._spreadsheet.sheets.cellEditor.cellEditorEl
    )
    const precedingCaretPosition = caretPosition - 1
    const isWithinInfiniteParameterSection =
      this._isWithinInfiniteParameterSection(tokens, caretPosition)
    const indexToHighlight = isWithinInfiniteParameterSection
      ? this.parameterSyntaxElements.length - 1
      : parameters.findIndex(
          token =>
            (caretPosition >= token.startOffset &&
              caretPosition <= token.endOffset!) ||
            (precedingCaretPosition >= token.startOffset &&
              precedingCaretPosition <= token.endOffset!)
        )

    this.parameterSyntaxElements.forEach(({ element }) => {
      element.classList.remove(`${functionSummaryHelperPrefix}-highlight`)
    })
    const placeholderElementToHighlight =
      this.parameterSyntaxElements[indexToHighlight]?.element

    placeholderElementToHighlight?.classList.add(
      `${functionSummaryHelperPrefix}-highlight`
    )
    console.log({
      parameters,
      placeholderElementToHighlight,
      indexToHighlight,
      caretPosition
    })
    // console.log(tokenToHighlight)
    /*const caretPosition = getCaretPosition(
      this._spreadsheet.sheets.cellEditor.cellEditorEl
    )
    const precedingCaretPosition = caretPosition - 1
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer
    const tokens = lexer.tokenizeFormula(text).tokens as IToken[]

    if (tokens[1]?.tokenType.name !== 'ProcedureName') {
      return
    }

    const eligibleTokensToHighlight = tokens.filter(token =>
      PLACEHOLDER_WHITELIST.every(ch => !token.tokenType.name.includes(ch))
    )
    const caretElementIndex = eligibleTokensToHighlight.findIndex(token => {
      const endOffset = token.endOffset! // ?? Number.MAX_VALUE
      return (
        (caretPosition >= token.startOffset && caretPosition <= endOffset) ||
        (precedingCaretPosition >= token.startOffset &&
          precedingCaretPosition <= endOffset)
      )
    })

    const separators = tokens.filter(
      token => token.tokenType.name === 'ArrayColSep'
    )
    const precedingSeparatorIndex = separators.findIndex(
      token => token.endOffset === precedingCaretPosition
    )

    this.parameterSyntaxElements.forEach(({ element }) => {
      element.classList.remove(`${functionSummaryHelperPrefix}-highlight`)
    })

    if (caretElementIndex === -1) {
      // && precedingSeparatorIndex === -1) {
      return
    }

    // const isWithinInfiniteParameterSection =
    //   this._isWithinInfiniteParameterSection(
    //     eligibleTokensToHighlight,
    //     caretPosition
    //   )

    let elementIndexToHighlight = caretElementIndex

    // const isAfterSeparator =
    //   caretElementIndex === -1 ||
    //   (precedingSeparatorIndex !== -1 && !isWithinInfiniteParameterSection)

    // if (isAfterSeparator) {
    //   elementIndexToHighlight = precedingSeparatorIndex + 1
    // }

    const placeholderElementToHighlight = this._getElementToHighlight(
      precedingSeparatorIndex,
      elementIndexToHighlight,
      false // isWithinInfiniteParameterSection
    )

    placeholderElementToHighlight.classList.add(
      `${functionSummaryHelperPrefix}-highlight`
    ) */
  }

  private _getFormulaText(text: string) {
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

    // if (formula[formula.length-1] === ',') {
    //   formula += 'PLACEHOLDER'
    // }

    if (missingRightParenthesesNumber > 0) {
      for (let index = 0; index < missingRightParenthesesNumber; index++) {
        formula += ')'
      }
    }

    return formula
  }

  private _isWithinInfiniteParameterSection(
    tokens: IToken[],
    currentCaretPosition: number
  ) {
    const eligibleTokensToHighlight = tokens.filter(token =>
      PLACEHOLDER_WHITELIST.every(ch => !token.tokenType.name.includes(ch))
    )
    const tokenBeforeInfiniteParameterPosition =
      eligibleTokensToHighlight[this.parameterSyntaxElements.length - 1]
        ?.startOffset
    return !!(
      last(this.parameterSyntaxElements)?.isInfiniteParameter &&
      currentCaretPosition >= tokenBeforeInfiniteParameterPosition
    )
  }

  private _getElementToHighlight(
    // precedingSeparatorIndex: number,
    elementIndexToHighlight: number
  ) {
    // const shouldHighlightLastElement =
    //   (precedingSeparatorIndex ||
    //     elementIndexToHighlight >= this.placeholderParameters?.length) &&
    //   isWithinInfiniteParameterSection

    // return shouldHighlightLastElement
    //   ? last(this.placeholderParameters)?.element
    //   : this.placeholderParameters[elementIndexToHighlight]?.element
    return this.parameterSyntaxElements[elementIndexToHighlight]?.element
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
