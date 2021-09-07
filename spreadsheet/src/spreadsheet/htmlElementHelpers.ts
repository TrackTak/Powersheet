export const createGroup = (
  elements: HTMLElement[],
  className: string,
  classNamePrefix: string
) => {
  const group = document.createElement('div');

  group.classList.add(className, `${classNamePrefix}-group`);

  elements.forEach((element) => {
    group.appendChild(element);
  });

  return group;
};
