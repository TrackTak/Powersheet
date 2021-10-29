import { prefix } from '../utils';
import styles from './FunctionHelper.module.scss';

export const functionHelperPrefix = `${prefix}-function-helper`;

export const createHeader = (headerText: string) => {
  const header = document.createElement('h3');
  header.classList.add(styles.header, `${functionHelperPrefix}`);
  header.innerHTML = `${headerText}`;

  return { header };
};

export const createCodeText = (codeText: string) => {
  const codeEl = document.createElement('p');
  const code = document.createElement('code');
  code.classList.add(styles.code, `${functionHelperPrefix}`);
  code.innerHTML = `${codeText}`;

  codeEl.appendChild(code);

  return { codeEl, code };
};

export const createParagraph = (paragraph: string) => {
  const paragraphEl = document.createElement('p');
  paragraphEl.classList.add(styles.paragraphEl, `${functionHelperPrefix}`);
  paragraphEl.innerHTML = `${paragraph}`;

  return { paragraphEl };
};
