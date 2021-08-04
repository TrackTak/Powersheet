export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  layout: 'fullscreen',
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

// https://github.com/storybookjs/storybook/issues/15753
document.addEventListener('DOMContentLoaded', function (e) {
  if (e.cancelable) {
    e.stopPropagation();
  }
});
