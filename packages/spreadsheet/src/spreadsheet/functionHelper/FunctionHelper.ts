import { Spreadsheet } from '../..'
import './FunctionHelper.scss'
import { MDCDrawer } from '@material/drawer'
import { functionHelperPrefix } from './functionHelperHtmlElementHelpers'

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
  codeSyntaxUsage: string[]
  codeSyntaxElements: ICodeSyntaxCode[]
  attributes: IAttribute[]
}

/**
 * Internal for now until we fully complete all
 * functions
 * @internal
 */
class FunctionHelper {
  functionHelperEl!: HTMLDivElement
  drawerContentEl!: HTMLDivElement
  drawer?: MDCDrawer
  closeIcon!: HTMLSpanElement
  closeButton!: HTMLButtonElement
  headerEl!: HTMLHeadElement
  textWrapper!: HTMLDivElement
  private _spreadsheet!: Spreadsheet

  /**
   * @param spreadsheet - The spreadsheet that this FunctionHelper is connected to.
   */
  initialize(spreadsheet: Spreadsheet) {
    this._spreadsheet = spreadsheet

    this.functionHelperEl = document.createElement('div')
    this.functionHelperEl.classList.add(
      `${functionHelperPrefix}`,
      'mdc-drawer',
      'mdc-drawer--dismissible'
    )

    this.drawerContentEl = document.createElement('div')
    this.drawerContentEl.classList.add(
      `${functionHelperPrefix}-drawer-content`,
      'mdc-drawer__content'
    )

    this.drawerContentEl.dir = 'ltr'

    this.functionHelperEl.appendChild(this.drawerContentEl)

    this.functionHelperEl.dir = 'rtl'

    this.closeIcon = document.createElement('span')
    this.closeIcon.classList.add(`${functionHelperPrefix}-close-icon`)

    this.closeButton = document.createElement('button')
    this.closeButton.classList.add(`${functionHelperPrefix}-close-button`)

    this.closeButton.addEventListener('click', () => {
      this._spreadsheet.options.showFunctionHelper = false

      this._spreadsheet.render()
    })

    this.drawerContentEl.appendChild(this.closeButton)
    this.closeButton.append(this.closeIcon)

    this.textWrapper = document.createElement('div')
    this.textWrapper.classList.add(`${functionHelperPrefix}-text-wrapper`)
  }

  /**
   * Attaches the drawer to the DOM. This must be called
   * after the spreadsheet has been attached to the DOM
   * or material-components will throw errors.
   */
  setDrawerContent(contentEl: HTMLElement) {
    this.drawerContentEl.appendChild(contentEl)

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
  }
}

export default FunctionHelper
