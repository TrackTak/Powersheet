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
import { subsequentPlaceholderWhitelist } from '../../sheets/cellEditor/CellEditor'
import { IToken } from 'chevrotain'
import { last } from 'lodash'

class FunctionSummaryHelper {
  functionSummaryHelperEl: HTMLDivElement
  functionSummaryHelperListContainerEl: HTMLDivElement
  expandIcon!: HTMLSpanElement
  accordionButton!: HTMLButtonElement
  helper: DelegateInstance
  textWrapper!: HTMLDivElement
  private _spreadsheet!: Spreadsheet

  /**
   * @internal
   */
  constructor(spreadsheet: Spreadsheet) {
    const {
      functionSummaryHelperContainerEl,
      functionSummaryHelperEl
    } = createWrapperContent()
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
    this._spreadsheet = spreadsheet
  }
  /**
   * Shows the function summary helper.
   *
   * @param functionName - The input function
   * @param inputParameters - The input parameters that have currently been typed by user
   */
  show(functionName: string, inputParameters: string) {
    const metadata = functionMetadata[functionName]
    if (metadata) {
      this._update(metadata, inputParameters)
      this.helper.show()
    }
  }

  updateParameterHighlights(currentCaretPosition: number, text: string) {
    const precedingTokenPosition = currentCaretPosition - 1
    // @ts-ignore
    const lexer = this._spreadsheet.hyperformula._parser.lexer
    const { tokens } = lexer.tokenizeFormula(text)
    const eligibleTokensToHighlight = tokens.filter((token: IToken) =>
      subsequentPlaceholderWhitelist.every(
        ch => !token.tokenType.name.includes(ch)
      )
    )
    let indexToHighlight = eligibleTokensToHighlight.findIndex(
      (token: IToken) => {
        const endOffset = token.endOffset ?? Number.MAX_VALUE
        return (
          (currentCaretPosition >= token.startOffset &&
            currentCaretPosition <= endOffset) ||
          (precedingTokenPosition >= token.startOffset &&
            precedingTokenPosition <= endOffset)
        )
      }
    )

    const parameterPlaceholderElements =
      this.functionSummaryHelperListContainerEl
        ?.getElementsByClassName(`${functionSummaryHelperPrefix}-parameters`)[0]
        ?.getElementsByTagName('span') || {}
    const parameterElementsEligibleForHighlight = Array.from(
      parameterPlaceholderElements
    ).filter(elem => !['(', ')', ','].includes(elem.textContent!.trim()))
    const isInInfiniteParameter =
      last(parameterElementsEligibleForHighlight)?.textContent?.includes('[') &&
      currentCaretPosition >=
        eligibleTokensToHighlight[
          parameterElementsEligibleForHighlight.length - 1
        ]?.startOffset

    const separators = tokens.filter(
      (token: IToken) => token.tokenType.name === 'ArrayColSep'
    )
    const precedingSeparatorIndex = separators.findIndex(
      (token: IToken) => token.endOffset === precedingTokenPosition
    )

    parameterElementsEligibleForHighlight.forEach(elem => {
      elem.classList.remove(`${functionSummaryHelperPrefix}-highlight`)
    })

    if (indexToHighlight === -1 && precedingSeparatorIndex === -1) {
      return
    }

    // Highlight after a separator
    if (
      indexToHighlight === -1 ||
      (precedingSeparatorIndex !== -1 && !isInInfiniteParameter)
    ) {
      indexToHighlight = precedingSeparatorIndex + 1
    }

    const placeholderElementToHighlight =
      (precedingSeparatorIndex ||
        indexToHighlight >= parameterElementsEligibleForHighlight.length) &&
      isInInfiniteParameter
        ? last(parameterElementsEligibleForHighlight)
        : parameterElementsEligibleForHighlight[indexToHighlight]

    placeholderElementToHighlight?.classList.add(
      `${functionSummaryHelperPrefix}-highlight`
    )
  }

  private _update(
    formulaMetadata: IFunctionHelperData,
    inputParameters: string
  ) {
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

    const { mainHeaderEl } = createMainHeader(
      formulaMetadata.header,
      formulaMetadata.parameters ?? '',
      inputParameters
    )

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
