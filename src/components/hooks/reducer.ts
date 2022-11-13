
import { nearest, roundCeil, roundFloor, roundup, zoomLevel } from '../../utils'
import type {StateChart} from './types'


// transform(a, b, c, d, e, f)
// Copy to Clipboard
// The transformation matrix is described by: [  
// a	c	e
// b	d	f
// 0	0	1 ]

// Parameters
// a (m11)
// Horizontal scaling. A value of 1 results in no scaling.
// b (m12)
// Vertical skewing.
// c (m21)
// Horizontal skewing.
// d (m22)
// Vertical scaling. A value of 1 results in no scaling.
// e (dx)
// Horizontal translation (moving).
// f (dy)
// Vertical translation (moving).



const calculateBounds = (matrix: DOMMatrix, rect: DOMRect) => {
  // bounds of the viewport in data space
  let inv = matrix.inverse()
  let top_left_corner = inv.transformPoint(new DOMPoint(0, 0))
  let bottom_right_corner = inv.transformPoint(new DOMPoint(rect.width, rect.height))
  let viewRect = new DOMRect(top_left_corner.x, top_left_corner.y, bottom_right_corner.x, bottom_right_corner.y)
  return viewRect
}

const calculateOuterBounds = (rect: DOMRect, zl: number) => {
  // rounds out to the nearest whole 1000 100 10, etc
  let zoom = Math.pow(10, zl)
  return new DOMRect(0, roundCeil(rect.y, zoom), 0, roundCeil(rect.height, zoom))
  // bbox to nearest sig dig outside of 

}

export type Actions =
| { type: 'setMatrix', payload: {matrix: DOMMatrix, rect: DOMRect} }
| { type: 'setCanvasSize', payload: {rect: DOMRect} }
//  | { type: 'setScale', payload: Vector }

export const reducer: React.Reducer<StateChart, Actions> = (state, action): StateChart => {
// function reducer(state: ExtraTradeEditor, action: Action) {
 switch (action.type) {
   case 'setMatrix':
      let bounds = calculateBounds(action.payload.matrix, action.payload.rect)
      let zl = zoomLevel(bounds.y-bounds.height)
      let outerBounds = calculateOuterBounds(bounds, zl)
      let matrix_x = new DOMMatrix([action.payload.matrix.a, 0, 0, 1, action.payload.matrix.e, 0])
      let matrix_y = new DOMMatrix([1, 0, 0, action.payload.matrix.d, 0, action.payload.matrix.f])
       return {...state, matrix: action.payload.matrix, bounds, outerBounds, matrix_x, matrix_y }

    case 'setCanvasSize': 
    return {...state, canvasSize: action.payload.rect}
   default: {
     throw new Error(`Unhandled action type`)
   }
 }
}
