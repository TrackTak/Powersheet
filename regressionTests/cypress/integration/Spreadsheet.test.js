const STORY = 'http://localhost:6006/?path=/story/spreadsheet--cells-data'
const COORDS = {
  CELL_A1: {
    x: 116,
    y: 27
  },
  CELL_C2: {
    x: 410,
    y: 59
  }
}

const TOOLBAR_SELECTOR = '.powersheet-toolbar'
const MERGE_BUTTON_SELECTOR = '[data-name="merge"]'

describe('Powersheet', () => {
  Cypress.Commands.add('iframe', { prevSubject: 'element' }, $iframe => {
    return new Cypress.Promise(resolve => {
      resolve($iframe.contents().find('#root'))
    })
  })

  const compareSnapshots = () => {
    cy.get('#storybook-preview-iframe').iframe().toMatchImageSnapshot()
  }

  it('Inserts row correctly.', () => {
    cy.visit(STORY).then(() => {
      cy.wait(1000) // TODO find better way

      const canvas = cy
        .get('#storybook-preview-iframe')
        .iframe()
        .find('canvas')
        .first()
        .rightclick(COORDS.CELL_A1.x, COORDS.CELL_A1.y)

      cy.get('#storybook-preview-iframe')
        .iframe()
        .contains('Insert row')
        .click()

      compareSnapshots()
    })
  })

  it('Merges cells correctly.', () => {
    cy.visit(STORY).then(() => {
      cy.wait(1000) // TODO find better way

      const canvas = cy
        .get('#storybook-preview-iframe')
        .iframe()
        .find('canvas')
        .first()
        .trigger('mousedown', COORDS.CELL_A1.x, COORDS.CELL_A1.y)
        .trigger('mousemove', COORDS.CELL_C2.x, COORDS.CELL_C2.y)

      cy.get('#storybook-preview-iframe')
        .iframe()
        .find(TOOLBAR_SELECTOR)
        .find(MERGE_BUTTON_SELECTOR)
        .click()

      compareSnapshots()
    })
  })
})
