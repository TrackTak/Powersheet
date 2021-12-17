import { IRect, Vector2d } from 'konva/lib/types'

export const prefix = 'powersheet'

export const rotatePoint = (
  { x, y }: { x: number; y: number },
  rad: number
) => {
  const rcos = Math.cos(rad)
  const rsin = Math.sin(rad)
  return { x: x * rcos - y * rsin, y: y * rcos + x * rsin }
}

export const dataKeysComparer = (x: string, y: string) => {
  return new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base'
  }).compare(x, y)
}

export const centerRectTwoInRectOne = (rectOne: IRect, rectTwo: IRect) => {
  const rectOneMidPoint = {
    x: rectOne.width / 2,
    y: rectOne.height / 2
  }

  const rectTwoMidPoint = {
    x: rectTwo.width / 2,
    y: rectTwo.height / 2
  }

  return {
    x: rectOneMidPoint.x - rectTwoMidPoint.x,
    y: rectOneMidPoint.y - rectTwoMidPoint.y
  }
}

export const reverseVectorsIfStartBiggerThanEnd = (
  start: Vector2d,
  end: Vector2d
) => {
  const newStart = { ...start }
  const newEnd = { ...end }

  if (start.x > end.x) {
    const temp = start.x

    newStart.x = end.x
    newEnd.x = temp
  }

  if (start.y > end.y) {
    const temp = start.y

    newStart.y = end.y
    newEnd.y = temp
  }

  return {
    start: newStart,
    end: newEnd
  }
}

// Taken from: https://codereview.stackexchange.com/questions/16124/implement-numbering-scheme-like-a-b-c-aa-ab-aaa-similar-to-converting
export const getColumnHeader = (number: number) => {
  const baseChar = 'A'.charCodeAt(0)
  let columnHeader = ''

  do {
    number -= 1
    columnHeader = String.fromCharCode(baseChar + (number % 26)) + columnHeader
    number = (number / 26) >> 0 // quick `floor`
  } while (number > 0)

  return columnHeader
}

export const setCaretToEndOfElement = (node: Node) => {
  const range = document.createRange()
  const sel = window.getSelection()

  range.selectNodeContents(node)
  range.collapse(false)

  sel?.removeAllRanges()
  sel?.addRange(range)

  range.detach()
}

export const saveCaretPosition = (node: Node) => {
  const selection = window.getSelection()
  const range = selection?.getRangeAt(0)

  range?.setStart(node, 0)

  const length = range?.toString().length

  return () => {
    if (!length) return

    const { position, node: newNode } = getTextNodeAtPosition(node, length)

    selection?.removeAllRanges()

    const range = new Range()

    range.setStart(newNode, position)
    selection?.addRange(range)
  }
}
export function getCaretPosition(node: Node): number {
  const selection = window.getSelection()
  const range = selection?.getRangeAt(0)!
  const treeWalker = document.createTreeWalker(
    node,
    undefined,
    function (node) {
      const nodeRange = document.createRange()
      nodeRange.selectNodeContents(node)
      return nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    }
  )

  let charCount = 0,
    lastNodeLength = 0

  if (range.startContainer.nodeType == 3) {
    charCount += range.startOffset
  }

  while (treeWalker.nextNode()) {
    charCount += lastNodeLength
    lastNodeLength = 0

    if (range.startContainer != treeWalker.currentNode) {
      if (treeWalker.currentNode instanceof Text) {
        lastNodeLength += treeWalker.currentNode.length
      } else if (
        treeWalker.currentNode instanceof HTMLBRElement ||
        treeWalker.currentNode instanceof HTMLImageElement
      ) {
        lastNodeLength++
      }
    }
  }

  return charCount + lastNodeLength
}

const getTextNodeAtPosition = (node: Node, index: number) => {
  const NODE_TYPE = NodeFilter.SHOW_TEXT
  const treeWalker = document.createTreeWalker(node, NODE_TYPE, elem => {
    if (elem.textContent && index > elem.textContent.length) {
      index -= elem.textContent.length

      return NodeFilter.FILTER_REJECT
    }
    return NodeFilter.FILTER_ACCEPT
  })

  const c = treeWalker.nextNode()

  return {
    node: c ? c : node,
    position: index
  }
}
