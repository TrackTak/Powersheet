import { Text } from 'konva/lib/shapes/Text';

class FontStyle {
  constructor(
    public text: Text | undefined,
    public bold: boolean,
    public italic: boolean
  ) {
    this.text = text;
    this.bold = bold;
    this.italic = italic;
  }

  getStyle() {
    if (this.bold && this.italic) return 'italic bold';

    if (this.bold && !this.italic) return 'bold';

    if (!this.bold && this.italic) return 'italic';

    return 'normal';
  }

  setStyle() {
    this.text?.fontStyle(this.getStyle());
  }
}

export default FontStyle;
