import { Spreadsheet } from '../..'
import './FunctionHelper.scss'
import { MDCDrawer } from '@material/drawer'
import { functionHelperPrefix } from './functionHelperHtmlElementHelpers'
import FunctionHelperList from './functionHelperList/FunctionHelperList'
import { groupBy } from 'lodash'

interface ICodeSyntaxElement {
  syntaxName: string
  description: string
}

interface ICodeSyntaxCode {
  codeSyntax: string
  values: ICodeSyntaxElement[]
}
interface IAttribute {
  header: string
  attributeNames: string[]
}

export interface IFunctionHelperData {
  header: string
  headerDescription: string
  parameters: string[]
  codeSyntaxUsage: string[]
  codeSyntaxElements: ICodeSyntaxCode[]
  attributes: IAttribute[]
  type: string
}

/**
 * Internal for now until we fully complete all
 * functions
 * @internal
 */
class FunctionHelper {
  functionHelperEl!: HTMLDivElement
  drawer?: MDCDrawer
  closeIcon!: HTMLSpanElement
  closeButton!: HTMLButtonElement
  headerEl!: HTMLHeadElement
  textWrapper!: HTMLDivElement
  private _spreadsheet!: Spreadsheet
  private _functionHelperList!: FunctionHelperList

  /**
   * @param spreadsheet - The spreadsheet that this FunctionHelper is connected to.
   */
  initialize(spreadsheet: Spreadsheet) {
    this._spreadsheet = spreadsheet
    const functionMetadataByGroup = groupBy(
      this._spreadsheet.functionMetadata,
      'type'
    )
    this._functionHelperList = new FunctionHelperList(functionMetadataByGroup)

    this.functionHelperEl = document.createElement('div')
    this.functionHelperEl.classList.add(
      `${functionHelperPrefix}`,
      'mdc-drawer',
      'mdc-drawer--dismissible'
    )

    this.closeIcon = document.createElement('span')
    this.closeIcon.classList.add(`${functionHelperPrefix}-close-icon`)

    this.closeButton = document.createElement('button')
    this.closeButton.classList.add(`${functionHelperPrefix}-close-button`)

    this.closeButton.addEventListener('click', () => {
      this._spreadsheet.options.showFunctionHelper = false

      this._spreadsheet.render()
    })
    this.functionHelperEl.appendChild(this.closeButton)
    this.closeButton.append(this.closeIcon)
    this.functionHelperEl.dir = 'rtl'
    this.functionHelperEl.appendChild(this._functionHelperList.functionListEl)

    this.textWrapper = document.createElement('div')
    this.textWrapper.classList.add(`${functionHelperPrefix}-text-wrapper`)
  }

  /**
   * Attaches the drawer to the DOM. This must be called
   * after the spreadsheet has been attached to the DOM
   * or material-components will throw errors.
   *
   */
  setDrawerContent() {
    this.drawer = MDCDrawer.attachTo(this.functionHelperEl)
    this._spreadsheet.render()
  }

  setFunctionMetadata(functionMetadata: Record<string, IFunctionHelperData>) {
    const functionMetadataByGroup = groupBy(functionMetadata, 'type')
    this._functionHelperList.setFunctionMetadata(functionMetadataByGroup)
  }

  scrollToFunction(functionName: string) {
    this._functionHelperList.scrollToFunction(functionName)
  }

  /**
   * @internal
   */
  _render() {
    if (this.drawer) {
      this.drawer.open = this._spreadsheet.options.showFunctionHelper
    }
  }

  /**
   * @internal
   */
  _destroy() {
    this.drawer?.destroy()
  }
}

export default FunctionHelper
