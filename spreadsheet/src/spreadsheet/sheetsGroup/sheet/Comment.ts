import { rotatePoint } from './../../utils';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { prefix } from '../../utils';
import Sheet from './Sheet';
import styles from './Comment.module.scss';
import tippy, { followCursor, Instance, Props } from 'tippy.js';
import Konva from 'konva';

export const commentPrefix = `${prefix}-comment`;

class Comment {
  textarea: HTMLTextAreaElement;
  container: Instance<Props>;
  line: Line;
  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.line = new Line({
      stroke: 'orange',
      fill: 'orange',
      strokeWidth: 2,
      offsetX: -6,
      offsetY: 1,
      points: [0, 5, 5, 5, 0, 0],
      closed: true,
    });

    this.line.cache();

    const container = document.createElement('div');
    this.textarea = document.createElement('textarea');

    container.classList.add(styles.container, `${commentPrefix}-container`);
    this.textarea.classList.add(styles.textarea, `${commentPrefix}-textarea`);

    this.container = tippy(this.sheet.container, {
      placement: 'auto',
      interactive: true,
      arrow: false,
      trigger: 'manual',
      delay: 0,
      plugins: [followCursor],
      followCursor: 'initial',
      theme: 'comment',
      showOnCreate: false,
      hideOnClick: true,
    });

    this.container.disable();
    this.container.hide();
  }

  show() {
    this.container.enable();
    this.container.show();

    const selectedFirstCell = this.sheet.selector.selectedFirstCell!;
    const id = selectedFirstCell.id();
    const { cell, clientRect } = this.sheet.drawNewCell(id);

    const lineConfig: LineConfig = {
      x: clientRect.width,
    };

    const line = this.line.clone(lineConfig) as Line;

    cell.add(line);

    const rotateAroundCenter = (line: Line<LineConfig>, rotation: number) => {
      const topLeft = { x: -line.width() / 2, y: -line.height() / 2 };
      const current = rotatePoint(topLeft, Konva.getAngle(line.rotation()));
      const rotated = rotatePoint(topLeft, Konva.getAngle(rotation));
      const dx = rotated.x - current.x,
        dy = rotated.y - current.y;

      line.rotation(rotation);
      line.x(line.x() + dx);
      line.y(line.y() + dy);
    };

    rotateAroundCenter(line, 180);

    this.container.setContent(this.textarea);
    //task move css konva line
  }
}

export default Comment;
