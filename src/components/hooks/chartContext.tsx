import React, {
  createContext, useContext, useEffect, useMemo, useReducer, useRef,
} from 'react';
import useResizeObserver from 'use-resize-observer';
import usePlotable from './usePlottable';
import { convertComponentsSpaceToChartSpace, EMPTY_VECTOR, getXY } from '../../utils';
import { AxisTime, AxisValue } from '../axis';
import { reducer } from './reducer';
import {
  IMouse, InitContextProps, IVariables, StateChart,
} from './types';

// https://github.com/pyqtgraph/pyqtgraph/blob/108365ba45c1a1302df110dad5f9d960d4d903a9/pyqtgraph/graphicsItems/ViewBox/ViewBox.py#L1656
// https://stackoverflow.com/questions/45528111/javascript-canvas-map-style-point-zooming/45528455#45528455

const initialState: StateChart = {
  matrix: new DOMMatrix(),
  matrix_x: new DOMMatrix(),
  matrix_y: new DOMMatrix(),
  bounds: new DOMRect(),
  outerBounds: new DOMRect(),
  canvasSize: new DOMRect(),
};

const ChartCTX = createContext({} as InitContextProps);
// ChartCTX.displayName = "React Graph Chart Context"

interface IChartContext {
  children: React.ReactNode
  scrollSpeed?: number
}

export const ChartContext: React.FC<IChartContext> = ({ children, scrollSpeed = 1 }) => {
  // REFS
  const containerRef = useRef<HTMLDivElement>(null);

  // STATE
  const [state, dispatch] = useReducer(reducer, initialState);
  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  // HOOKS
  // const { matrix } = usePlotable();

  // VARIABLES

  const { current: mouse } = useRef<IMouse>({
    button: null,
    realPos: EMPTY_VECTOR,
    clickPos: EMPTY_VECTOR,
    pos: EMPTY_VECTOR,
    realClickPos: EMPTY_VECTOR,
  });

  const { current: variables } = useRef<IVariables>({
    matrix: new DOMMatrix(),
    isDragging: false,
  });

  const { width, height } = useResizeObserver<HTMLDivElement>({
    ref: containerRef,
    onResize: (size) => {
      console.log(size);
      dispatch({ type: 'setCanvasSize', payload: { rect: new DOMRect(0, 0, size.width, size.height) } });
    },
  });

  // ON MOUNT
  useEffect(() => {
    if (containerRef.current === null) { return; }
    // containerRef!.current!.addEventListener('pointermove', handlePointerMove, { passive: false });
    dispatch({ type: 'setMatrix', payload: { matrix: variables.matrix, rect: containerRef.current.getBoundingClientRect() } });
  }, []);

  // EVENT HANDLERS

  const handlePointerMove = (event: React.PointerEvent) => {
    if (containerRef.current === null) { return; }

    mouse.bounds = containerRef.current.getBoundingClientRect();
    mouse.pos = getXY(containerRef.current, event);
    mouse.realPos = convertComponentsSpaceToChartSpace(mouse.pos, variables.matrix);

    switch (mouse.button) {
      case 0: { // left -- translate
        // code block
        variables.isDragging = true;
        translateView({ x: mouse.pos.x - mouse.clickPos.x, y: mouse.pos.y - mouse.clickPos.y });
        break;
      }
      case 1: { // middle -- scale
        // event.preventDefault()
        variables.isDragging = true;
        scaleView(
          { x: 1 - ((mouse.clickPos.x - mouse.pos.x) / 250), y: 1 - ((mouse.clickPos.y - mouse.pos.y) / 250) },
          { x: mouse.realClickPos.x, y: mouse.realClickPos.y },
        );
        break;
      }
      case 2: // right
        // code block
        break;
      default:

      // code block
    }
  };
  const handleWheel = (wheelEvent: React.WheelEvent) => {
    // event.preventDefault(); // stop the page scrolling

    const {
      pageX, pageY, deltaY, deltaMode,
    } = wheelEvent;

    if (containerRef.current === null) { return; }

    mouse.pos = getXY(containerRef.current, wheelEvent);
    mouse.realPos = convertComponentsSpaceToChartSpace(mouse.clickPos, variables.matrix);

    const change = deltaY;

    if (change) {
      scaleView({ x: change, y: change }, mouse.realPos);
    }
  };

  const scaleView = (vector: Vector, origin: MousePosition) => {
    if (containerRef.current === null) { return; }
    mouse.bounds = containerRef.current.getBoundingClientRect();
    const offsetMatrix = new DOMMatrix().translateSelf(origin.x, origin.y);
    const scaleMatrix = variables.matrix.multiply(offsetMatrix);
    scaleMatrix.scaleSelf(vector.x, vector.y);
    scaleMatrix.multiplySelf(offsetMatrix.inverse());
    dispatch({ type: 'setMatrix', payload: { matrix: scaleMatrix, rect: mouse.bounds } });
  };

  const translateView = (vector: Vector) => {
    if (containerRef.current === null) { return; }
    mouse.bounds = containerRef.current.getBoundingClientRect();
    const newMatrix = new DOMMatrix([
      variables.matrix.a, 0,
      0, variables.matrix.d,
      vector.x + variables.matrix.e, vector.y + variables.matrix.f,
    ]);
    dispatch({ type: 'setMatrix', payload: { matrix: newMatrix, rect: mouse.bounds } });
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === '+') {
      // zoom

    } else if (event.key === 'y') {
      const newMatrix = new DOMMatrix();
      if (containerRef.current === null) { return; }
      mouse.bounds = containerRef.current.getBoundingClientRect();

      dispatch({ type: 'setMatrix', payload: { matrix: new DOMMatrix(), rect: mouse.bounds } });
    }

    event.stopPropagation();
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (containerRef.current === null) { return; }
    mouse.clickPos = getXY(containerRef.current, event);
    mouse.realClickPos = convertComponentsSpaceToChartSpace(mouse.clickPos, state.matrix);
    mouse.button = event.button;
    variables.matrix = state.matrix;
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (containerRef.current === null) { return; }
    mouse.button = null;
    variables.matrix = state.matrix;
    variables.isDragging = false;
  };

  const handlePointerOut = (event: React.PointerEvent) => {
    if (containerRef.current === null) { return; }
    mouse.button = null;
  };

  const value = {
    state: contextValue.state,
    variables,
    mouse,
    dispatch: contextValue.dispatch,
    matrix: variables.matrix,
    scaleView,
    translateView,
  };

  return (
    <ChartCTX.Provider value={value}>
      <div className="master-outer">

        <div className="rg-chart-outer">

          <div
            ref={containerRef}
            className="rg-chart-main"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            // onScroll={(event) => event.persist()} // need this
            onPointerOut={handlePointerOut}
            onKeyDown={handleKeyPress}
          >
            {children}
          </div>

          <AxisValue />
          <AxisTime />

          <div className="rg-chart-corner" />
        </div>

      </div>

    </ChartCTX.Provider>
  );
};

const useChartContext = () => useContext(ChartCTX);
export default useChartContext;
