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
import { IFunctionHelperData } from '../FunctionHelper'
import { subsequentPlaceholderWhitelist } from '../../sheets/cellEditor/CellEditor'
import { IToken } from 'chevrotain'
import { last } from 'lodash'
import { getCaretPosition } from '../../utils'

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
    const metadata = this._spreadsheet.functionMetadata[functionName]
    if (metadata) {
      this._update(metadata)
      this.helper.show()
    }
  }

  updateParameterHighlights(text: string) {
    const formula = this._getFormulaText(text)
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer
    const tokens = lexer.tokenizeFormula(text).tokens as IToken[]
    const { ast } =
      // @ts-ignore
      this._spreadsheet.hyperformula.extractFormula(
        formula,
        this._spreadsheet.sheets.activeSheetId
      )
    const caretPosition = getCaretPosition(
      this._spreadsheet.sheets.cellEditor.cellEditorEl
    )
    // @ts-ignore
    if (ast?.args === undefined || caretPosition > ast.endOffset) {
      this._clearHighlights()
      return
    }
    // @ts-ignore
    const parameters = ast.args as IToken[]

    const precedingCaretPosition = caretPosition - 1
    const isWithinInfiniteParameterSection =
      this._isWithinInfiniteParameterSection(tokens, caretPosition)
    let indexToHighlight = isWithinInfiniteParameterSection
      ? this.parameterSyntaxElements.length - 1
      : parameters.findIndex(
          token =>
            (caretPosition >= token.startOffset &&
              caretPosition <= token.endOffset!) ||
            (precedingCaretPosition >= token.startOffset &&
              precedingCaretPosition <= token.endOffset!)
        )
    if (parameters.length === 0) {
      indexToHighlight = 0
    }
    this._clearHighlights()
    const placeholderElementToHighlight =
      this.parameterSyntaxElements[indexToHighlight]?.element

    placeholderElementToHighlight?.classList.add(
      `${functionSummaryHelperPrefix}-highlight`
    )
  }

  private _clearHighlights = () =>
    this.parameterSyntaxElements.forEach(({ element }) => {
      element.classList.remove(`${functionSummaryHelperPrefix}-highlight`)
    })

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
      subsequentPlaceholderWhitelist.every(ch => !token.tokenType.name.includes(ch))
    )
    const tokenBeforeInfiniteParameterPosition =
      eligibleTokensToHighlight[this.parameterSyntaxElements.length - 1]
        ?.startOffset
    return !!(
      last(this.parameterSyntaxElements)?.isInfiniteParameter &&
      currentCaretPosition >= tokenBeforeInfiniteParameterPosition
    )
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
      this._spreadsheet.functionHelper?.scrollToFunction(formulaMetadata.header)
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
