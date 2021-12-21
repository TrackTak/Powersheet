import './FunctionHelperList.scss'
import { functionMetadataByGroup } from '../functionMetadata'
import {
  ClickHandler,
  createFunctionList,
  updateFunctionList
} from './functionHelperListHtmlElementHelpers'

class FunctionHelper {
  functionListEl!: HTMLDivElement
  drawerContentEl!: HTMLDivElement
  drawerHeaderEl!: HTMLDivElement

  constructor(private onFunctionItemClick: ClickHandler) {
    const { functionListEl, drawerHeaderEl, drawerContentEl } =
      createFunctionList(
        this._onSearch,
        this.onFunctionItemClick,
        functionMetadataByGroup
      )
    this.functionListEl = functionListEl
    this.drawerHeaderEl = drawerHeaderEl
    this.drawerContentEl = drawerContentEl
  }

  /**
   * @internal
   */
  private _onSearch = (e: Event) => {
    const searchText = (e.target as HTMLInputElement).value
    updateFunctionList(
      this.drawerContentEl,
      this.onFunctionItemClick,
      functionMetadataByGroup,
      searchText
    )
  }

  /**
   * @internal
   */
  _destroy() {}
}

export default FunctionHelper
