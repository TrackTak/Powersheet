import { rotatePoint } from './../../utils';
import Konva from 'konva';
import { Line, LineConfig } from 'konva/lib/shapes/Line';
import { prefix } from '../../utils';
import Sheet from './Sheet';
import styles from './Comment.module.scss';
import tippy, { followCursor, Instance, Props } from 'tippy.js';

export const commentPrefix = `${prefix}-comment`;

class Comment {
  textarea: HTMLTextAreaElement;
  container: Instance<Props>;
  commentMarkerConfig: LineConfig;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.commentMarkerConfig = this.sheet.styles.commentMarker;

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

    const commentMarker = new Line({
      ...this.commentMarkerConfig,
      x: clientRect.width,
    });

    cell.add(commentMarker);

    const rotateAroundCenter = (
      commentMarker: Line<LineConfig>,
      rotation: number
    ) => {
      const topLeft = {
        x: -commentMarker.width() / 2,
        y: -commentMarker.height() / 2,
      };
      const current = rotatePoint(
        topLeft,
        Konva.getAngle(commentMarker.rotation())
      );
      const rotated = rotatePoint(topLeft, Konva.getAngle(rotation));
      const dx = rotated.x - current.x,
        dy = rotated.y - current.y;

      commentMarker.rotation(rotation);
      commentMarker.x(commentMarker.x() + dx);
      commentMarker.y(commentMarker.y() + dy);
    };

    rotateAroundCenter(commentMarker, 180);

    this.container.setContent(this.textarea);
  }
}

export default Comment;
