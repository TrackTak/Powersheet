import Sheet from '../Sheet';
import tippy, { followCursor, Instance, Props } from 'tippy.js';
import {
  createButtonContainer,
  createCancelButton,
  createContent,
  createSuccessButton,
  createTextarea,
} from './commentHtmlHelpers';
import { CellId } from '../CellRenderer';

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

    this.container = tippy(this.sheet.sheetEl, {
      placement: 'auto',
      interactive: true,
      arrow: false,
      trigger: 'manual',
      delay: 100,
      plugins: [followCursor],
      followCursor: 'initial',
      theme: 'comment',
      showOnCreate: false,
      content: this.content,
      hideOnClick: true,
      onHide: () => {
        this.textarea.value = '';
      },
    });

    this.hide();

    this.cancelButton.addEventListener('click', this.cancelButtonOnClick);
    this.successButton.addEventListener('click', this.successButtonOnClick);
  }

  cancelButtonOnClick = () => {
    this.hide();
  };

  successButtonOnClick = () => {
    const id = this.sheet.selector.selectedFirstCell!.id();

    this.sheet.cellRenderer.setCellData(id, {
      comment: this.textarea.value,
    });

    this.sheet.updateViewport();
    this.hide();
  };

  destroy() {
    this.successButton.removeEventListener('click', this.successButtonOnClick);
    this.cancelButton.removeEventListener('click', this.cancelButtonOnClick);
  }

  hide() {
    this.container.hide();
    this.textarea.value = '';
  }

  show(cellId: CellId) {
    // unmount forces position to update
    this.container.unmount();
    this.container.show();

    const comment = this.sheet.cellRenderer.getCellData(cellId)?.comment;

    if (comment) {
      this.textarea.value = comment;
    }
  }
}

export default Comment;
