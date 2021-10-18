describe('Powersheet', () => {
  Cypress.Commands.add('iframe', { prevSubject: 'element' }, $iframe => {
    return new Cypress.Promise(resolve => {
      // $iframe.on('load', () => {
      resolve($iframe.contents().find('#root'))
      // })
    })
  })
  it('Init', () => {
    cy.visit(
      'http://localhost:6006/?path=/story/spreadsheet--real-example'
    ).then(() => {
      cy.wait(1000) // TODO find better way

      const canvas = cy
        .get('#storybook-preview-iframe')
        .iframe()
        .find('canvas')
        .first()
        .rightclick(100, 150)

      cy.get('#storybook-preview-iframe')
        .iframe()
        .contains('Insert row')
        .click()

      cy.get('#storybook-preview-iframe').iframe().toMatchImageSnapshot()
    })
  })
})
