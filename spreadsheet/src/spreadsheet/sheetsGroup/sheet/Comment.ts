import Sheet from './Sheet';
import tippy, { followCursor, Instance, Props } from 'tippy.js';
import {
  createButtonContainer,
  createCancelButton,
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

    this.hideContainer();

    this.cancelButton.addEventListener('click', this.cancelButtonOnClick);
    this.successButton.addEventListener('click', this.successButtonOnClick);
  }

  hideContainer() {
    this.container.disable();
    this.container.hide();
    this.textarea.value = '';
  }

  cancelButtonOnClick = () => {
    this.hideContainer();
  };

  successButtonOnClick = () => {
    const id = this.sheet.selector.selectedFirstCell!.id();

    this.sheet.setCellData(id, {
      comment: this.textarea.value,
    });

    this.sheet.updateCells();
    this.hideContainer();
  };

  destroy() {
    this.successButton.removeEventListener('click', this.successButtonOnClick);
    this.cancelButton.removeEventListener('click', this.cancelButtonOnClick);
  }

  show() {
    this.container.enable();
    this.container.show();

    const id = this.sheet.selector.selectedFirstCell!.id();
    const comment = this.sheet.data.sheetData[id]?.comment;

    if (comment) {
      this.textarea.value = comment;
    }
  }
}

export default Comment;
