import { Text } from 'konva/lib/shapes/Text';

class TextDecoration {
  constructor(
    public text: Text,
    public strikeThrough?: boolean,
    public underline?: boolean
  ) {
    this.text = text;
    this.strikeThrough = strikeThrough;
    this.underline = underline;
  }

  getStyle() {
    if (this.strikeThrough && this.underline) return 'line-through underline';

    if (this.strikeThrough && !this.underline) return 'line-through';

    if (!this.strikeThrough && this.underline) return 'underline';

    return '';
  }

  setStyle() {
    this.text.textDecoration(this.getStyle());
  }
}

export default TextDecoration;
