import Sheets from '../Sheets'
import tippy, { followCursor, Instance, Props } from 'tippy.js'
import { createContent, createHeader } from './cellErrorHtmlHelpers'

class CellError {
  wrapper: HTMLDivElement
  header: HTMLHeadingElement
  content: HTMLDivElement
  container: Instance<Props>

  /**
   * @internal
   */
  constructor(private _sheets: Sheets) {
    this.wrapper = document.createElement('div')
    this.header = createHeader('Error')
    this.content = createContent()

    this.wrapper.appendChild(this.header)
    this.wrapper.appendChild(this.content)

    this.container = tippy(this._sheets.sheetEl, {
      placement: 'auto',
      interactive: true,
      arrow: false,
      trigger: 'manual',
      delay: 100,
      plugins: [followCursor],
      followCursor: 'initial',
      theme: 'cellError',
      showOnCreate: false,
      content: this.wrapper,
      hideOnClick: true,
      onHide: () => {
        this.content.textContent = ''
      }
    })

    this.hide()
  }

  /**
   * @internal
   */
  _destroy() {
    this.content.remove()
    this.container.destroy()
  }

  hide() {
    this.container.hide()
    this.content.textContent = ''
  }

  show(message: string) {
    // unmount forces position to update
    this.container.unmount()
    this.container.show()

    this.content.textContent = message
  }
}

export default CellError
