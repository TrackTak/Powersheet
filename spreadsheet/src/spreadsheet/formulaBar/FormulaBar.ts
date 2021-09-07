import EventEmitter from 'eventemitter3';
import events from '../events';
import Sheet from '../sheetsGroup/sheet/Sheet';
import { prefix } from './../utils';
import styles from './FormulaBar.module.scss';
import { createFormulaEditorArea } from './formulaBarHtmlElementHelpers';

interface IConstructor {
  eventEmitter: EventEmitter;
}

export const formulaBarPrefix = `${prefix}-formula-bar`;

class FormulaBar {
  formulaBarEl: HTMLDivElement;
  editorArea: HTMLDivElement;
  editableContentContainer: HTMLDivElement;
  editableContent: HTMLDivElement;
  eventEmitter: EventEmitter;
  focusedSheet: Sheet | null;

  constructor(params: IConstructor) {
    this.eventEmitter = params.eventEmitter;

    this.formulaBarEl = document.createElement('div');
    this.formulaBarEl.classList.add(styles.formulaBar, formulaBarPrefix);
    this.focusedSheet = null;

    const { editorArea, editableContentContainer, editableContent } =
      createFormulaEditorArea();

    this.formulaBarEl.appendChild(editorArea);

    editableContentContainer.addEventListener('click', () => {
      editableContent.contentEditable = 'true';
      editableContent.focus();
    });

    this.editorArea = editorArea;
    this.editableContentContainer = editableContentContainer;
    this.editableContent = editableContent;

    this.eventEmitter.on(events.selector.startSelection, this.onStartSelection);
    this.eventEmitter.on(events.cellEditor.change, this.onCellEditorChange);
  }

  onStartSelection = (sheet: Sheet) => {
    this.focusedSheet = sheet;
  };

  onCellEditorChange = (textContent: string | null) => {
    this.editableContent.textContent = textContent;
  };
}

export default FormulaBar;
