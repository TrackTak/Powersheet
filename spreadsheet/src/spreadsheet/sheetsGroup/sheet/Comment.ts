import Sheet from './Sheet';
import styles from './Comment.module.scss';
import tippy, { followCursor, Instance, Props } from 'tippy.js';
import {
  commentPrefix,
  createButtonContainer,
  createCancelButton,
  createContainer,
  createContent,
  createSuccessButton,
  createTextarea,
} from './commentHtmlHelpers';

class Comment {
  textarea: HTMLTextAreaElement;
  content: HTMLDivElement;
  buttonContainer: HTMLDivElement;
  successButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  container: Instance<Props>;

  constructor(private sheet: Sheet) {
    this.sheet = sheet;
    this.content = createContent();
    this.textarea = createTextarea();
    this.buttonContainer = createButtonContainer();
    this.successButton = createSuccessButton();
    this.cancelButton = createCancelButton();

    this.content.appendChild(this.textarea);
    this.content.appendChild(this.buttonContainer);
    this.buttonContainer.appendChild(this.successButton);
    this.buttonContainer.appendChild(this.cancelButton);

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
      content: this.content,
      hideOnClick: true,
    });

    this.container.disable();
    this.container.hide();
  }

  show() {
    this.container.enable();
    this.container.show();
  }
}

export default Comment;
