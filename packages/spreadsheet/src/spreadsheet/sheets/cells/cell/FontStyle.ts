import { Text } from 'konva/lib/shapes/Text'

class FontStyle {
  constructor(
    public text: Text,
    public bold: boolean,
    public italic: boolean
  ) {}

  getStyle() {
    if (this.bold && this.italic) return 'italic bold'

    if (this.bold && !this.italic) return 'bold'

    if (!this.bold && this.italic) return 'italic'

    return 'normal'
  }

  setStyle() {
    const style = this.getStyle()

    this.text.fontStyle(style)
  }
}

export default FontStyle
