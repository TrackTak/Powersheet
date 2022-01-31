import isEmpty from 'lodash/isEmpty'
import { HyperFormula } from '@tracktak/hyperformula'
import Autocomplete from '../dataTypes/autocomplete/Autocomplete'

class FormulaHelper {
  autocomplete: Autocomplete

  /**
   * @internal
   */
  constructor(_onItemClick: (item: string) => void) {
    this.autocomplete = new Autocomplete(_onItemClick)
  }

  /**
   * Shows the formula helper.
   *
   * @param text - Filters for formulas that start with this text string
   */
  show(text?: string) {
    const hfFormulas = HyperFormula.getRegisteredFunctionNames('enGB')
    const formulas = hfFormulas.filter(
      formula => !text || formula.startsWith(text)
    )
    if (isEmpty(formulas)) {
      this.autocomplete.hide()
      return
    }
    this.autocomplete._updateList(
      formulas.map(value => {
        return {
          label: value,
          value
        }
      })
    )
    this.autocomplete.show()
  }

  hide() {
    this.autocomplete.hide()
  }

  /**
   * @internal
   */
  _destroy() {
    this.autocomplete._destroy()
  }
}

export default FormulaHelper
