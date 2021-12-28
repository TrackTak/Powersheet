import { Spreadsheet } from '../..'
import './FunctionHelper.scss'
import { MDCDrawer } from '@material/drawer'
import { functionHelperPrefix } from './functionHelperHtmlElementHelpers'
import FunctionHelperList from './functionHelperList/FunctionHelperList'

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
    this._functionHelperList = new FunctionHelperList(this._onFunctionItemClick)

    this.functionHelperEl = document.createElement('div')
    this.functionHelperEl.classList.add(
      `${functionHelperPrefix}`,
      'mdc-drawer',
      'mdc-drawer--dismissible'
    )

    this.functionHelperEl.dir = 'rtl'
    this.functionHelperEl.appendChild(this._functionHelperList.functionListEl)

    this.textWrapper = document.createElement('div')
    this.textWrapper.classList.add(`${functionHelperPrefix}-text-wrapper`)
  }

  /**
   * @internal
   */
  private _onFunctionItemClick = (e: Event) => {
    const target = e.currentTarget as HTMLElement
    const clickedFunction = target.getAttribute('data-function-name')
    if (!clickedFunction) {
      return
    }
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
    this._functionHelperList._destroy()
  }
}

export default FunctionHelper
