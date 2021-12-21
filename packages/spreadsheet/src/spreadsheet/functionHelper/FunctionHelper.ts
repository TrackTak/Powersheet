import { Spreadsheet } from '../..'
import './FunctionHelper.scss'
import { MDCDrawer } from '@material/drawer'
import {
  createFunctionGroupSection,
  createFunctionItem,
  functionHelperPrefix
} from './functionHelperHtmlElementHelpers'
import { functionMetadataByGroup } from './functionMetadata'

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
  parameters?: string[]
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
  drawerContentEl!: HTMLDivElement
  drawerHeaderEl!: HTMLDivElement
  searchInput!: HTMLInputElement
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

    this._initializeHeader()

    this.functionHelperEl = document.createElement('div')
    this.functionHelperEl.classList.add(
      `${functionHelperPrefix}`,
      'mdc-drawer',
      'mdc-drawer--dismissible'
    )

    this.functionHelperEl.appendChild(this.drawerHeaderEl)
    this._initializeContent()
    this.functionHelperEl.appendChild(this.drawerContentEl)
    this.functionHelperEl.dir = 'rtl'

    this.textWrapper = document.createElement('div')
    this.textWrapper.classList.add(`${functionHelperPrefix}-text-wrapper`)
  }

  /**
   * @internal
   */
  private _initializeHeader() {
    this.drawerHeaderEl = document.createElement('div')
    this.drawerHeaderEl.classList.add(
      `${functionHelperPrefix}-drawer-header`,
      'mdc-drawer__header'
    )
    this.drawerHeaderEl.dir = 'ltr'

    this.closeIcon = document.createElement('span')
    this.closeIcon.classList.add(`${functionHelperPrefix}-close-icon`)
    this.closeButton = document.createElement('button')
    this.closeButton.classList.add(`${functionHelperPrefix}-close-button`)
    this.closeButton.addEventListener('click', () => {
      this._spreadsheet.options.showFunctionHelper = false

      this._spreadsheet.render()
    })
    this.closeButton.append(this.closeIcon)
    this.drawerHeaderEl.appendChild(this.closeButton)

    const headerText = document.createElement('h3')
    headerText.textContent = 'Function Helper'
    this.drawerHeaderEl.appendChild(headerText)

    this.searchInput = document.createElement('input')
    this.searchInput.classList.add(`${functionHelperPrefix}-search-input`)
    this.searchInput.placeholder = 'Search Function'
    this.searchInput.addEventListener('input', this._onSearch)
    this.drawerHeaderEl.appendChild(this.searchInput)
  }

  /**
   * @internal
   */
  private _initializeContent() {
    this.drawerContentEl = document.createElement('div')
    this.drawerContentEl.classList.add(
      `${functionHelperPrefix}-drawer-content`,
      'mdc-drawer__content'
    )
    this.drawerContentEl.dir = 'ltr'

    Object.keys(functionMetadataByGroup).forEach(key => {
      const { section } = createFunctionGroupSection(key)
      this.drawerContentEl.appendChild(section)
      functionMetadataByGroup[key].map(formulaMetadata => {
        const { functionItem } = createFunctionItem(formulaMetadata)
        functionItem.setAttribute('data-function-name', formulaMetadata.header)
        functionItem.addEventListener('click', this._onFunctionItemClick)
        this.drawerContentEl.appendChild(functionItem)
      })
    })
  }

  /**
   * @internal
   */
  private _onSearch = (e: Event) => {
    const searchText = (e.target as HTMLInputElement).value
    this.drawerContentEl.replaceChildren()
    Object.keys(functionMetadataByGroup).forEach(key => {
      const filtered = functionMetadataByGroup[key].filter(formula =>
        formula.header.toUpperCase().includes(searchText.toUpperCase())
      )
      if (filtered.length) {
        const { section } = createFunctionGroupSection(key)
        this.drawerContentEl.appendChild(section)
        filtered.map(formulaMetadata => {
          const { functionItem } = createFunctionItem(formulaMetadata)
          this.drawerContentEl.appendChild(functionItem)
        })
      }
    })
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
    this.searchInput.removeEventListener('input', this._onSearch)
  }
}

export default FunctionHelper
