import tippy, { Instance, Props } from 'tippy.js'
import {
  createAutocompleteList,
  createWrapperContent,
  LabelValue
} from './autocompleteHtmlElementHelpers'

class Autocomplete {
  dropdownEl: HTMLDivElement
  listContainerEl: HTMLDivElement
  tippy: Instance<Props>
  list?: HTMLUListElement

  constructor(private _onItemClick: (value: string) => void) {
    const { dropdownEl, listContainerEl, tippyContainer } =
      createWrapperContent()
    this.dropdownEl = dropdownEl
    this.listContainerEl = listContainerEl
    this.tippy = tippy(tippyContainer, {
      placement: 'bottom-start',
      offset: [0, 0],
      interactive: true,
      arrow: false,
      theme: 'autocomplete',
      trigger: 'manual',
      maxWidth: ''
    })
  }

  /**
   * @internal
   */
  _handleListItemClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target?.matches('li')) {
      this._onItemClick(target.dataset.value as string)
    }
  }

  /**
   * @internal
   */
  _updateList(items: LabelValue[]) {
    const list = createAutocompleteList(items)
    if (this.list) {
      this.listContainerEl?.replaceChild(list, this.list)
    } else {
      this.listContainerEl.appendChild(list)
    }
    this.list = list
    this.tippy.setContent(this.listContainerEl)

    list.addEventListener('click', this._handleListItemClick)
  }

  /**
   * Shows the autocomplete.
   */
  show() {
    this.tippy.show()
  }

  /**
   * Hide the autocomplete
   */
  hide() {
    this.tippy.hide()
  }

  /**
   * @internal
   */
  _destroy() {
    this.tippy.destroy()
    this.dropdownEl.remove()
  }
}

export default Autocomplete
