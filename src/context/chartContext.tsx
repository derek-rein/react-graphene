import type React from "react";
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import useResizeObserver from "use-resize-observer";
import { AxisTime, AxisValue } from "../components/axis";
import {
	EMPTY_VECTOR,
	convertComponentsSpaceToChartSpace,
	getXY,
} from "../utils";
import { reducer } from "./reducer";
import type { IMouse, IVariables, InitContextProps, StateChart } from "./types";

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
	children: React.ReactNode;
	scrollSpeed?: number;
}

export const ChartContext: React.FC<IChartContext> = ({
	children,
	scrollSpeed = 1,
}) => {
	// REFS
	const containerRef = useRef<HTMLDivElement>(null);

	// STATE
	const [state, dispatch] = useReducer(reducer, initialState);
	const contextValue = useMemo(() => ({ state, dispatch }), [state]);

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
			dispatch({
				type: "setCanvasSize",
				payload: { rect: new DOMRect(0, 0, size.width, size.height) },
			});
		},
	});

	// ON MOUNT
	useEffect(() => {
		if (containerRef.current === null) {
			return;
		}
		// containerRef!.current!.addEventListener('pointermove', handlePointerMove, { passive: false });
		dispatch({
			type: "setMatrix",
			payload: {
				matrix: variables.matrix,
				rect: containerRef.current.getBoundingClientRect(),
			},
		});
	}, []);

	// EVENT HANDLERS

	const handlePointerMove = (event: React.PointerEvent) => {
		if (containerRef.current === null) {
			return;
		}

		mouse.bounds = containerRef.current.getBoundingClientRect();
		mouse.pos = getXY(containerRef.current, event);
		mouse.realPos = convertComponentsSpaceToChartSpace(
			mouse.pos,
			variables.matrix,
		);

		switch (mouse.button) {
			case 0: {
				variables.isDragging = true;

				// Calculate screen delta since last move event
				const screenDeltaX = mouse.pos.x - mouse.clickPos.x;
				const screenDeltaY = mouse.pos.y - mouse.clickPos.y;

				// Pass the raw screen delta directly to translateView
				translateView({
					x: screenDeltaX,
					y: screenDeltaY,
				});

				// Update clickPos to current pos for next incremental calculation
				mouse.clickPos = mouse.pos;
				break;
			}
			case 1: {
				// middle -- scale (Targeted approach - keep as is)
				if (!mouse.initialScreenClickPos || !mouse.realClickPos) break; // Need initial positions
				variables.isDragging = true;
				const sensitivity = 500; // Linear scaling sensitivity

				// Total screen delta from drag start
				const totalDeltaX = mouse.pos.x - mouse.initialScreenClickPos.x;
				const totalDeltaY = mouse.pos.y - mouse.initialScreenClickPos.y;

				// Linear scale factor based on total delta
				const scaleX = 1 + totalDeltaX / sensitivity;
				const scaleY = 1 + totalDeltaY / sensitivity;
				const safeScaleX = Math.max(0.01, scaleX);
				const safeScaleY = Math.max(0.01, scaleY);

				const initialMatrix = variables.matrix;
				const chartOrigin = mouse.realClickPos; // Chart space origin point
				const screenOriginStart = mouse.initialScreenClickPos; // Screen space origin point

				// 1. Calculate matrix representing only the scaling around the chart origin
				const scaleTransform = new DOMMatrix()
					.translate(chartOrigin.x, chartOrigin.y)
					.scale(safeScaleX, safeScaleY)
					.translate(-chartOrigin.x, -chartOrigin.y);
				const scaledMatrix = scaleTransform.multiply(initialMatrix);

				// 2. Find where the chart origin lands on screen *with this scaled matrix*
				const chartOriginPoint = new DOMPoint(chartOrigin.x, chartOrigin.y);
				const screenOriginAfterScale =
					chartOriginPoint.matrixTransform(scaledMatrix);

				// 3. Calculate the screen space correction needed
				const correctionX = screenOriginStart.x - screenOriginAfterScale.x;
				const correctionY = screenOriginStart.y - screenOriginAfterScale.y;

				// 4. Apply the correction to the scaled matrix's translation components (e, f)
				const targetMatrix = new DOMMatrix([
					scaledMatrix.a,
					scaledMatrix.b,
					scaledMatrix.c,
					scaledMatrix.d,
					scaledMatrix.e + correctionX,
					scaledMatrix.f + correctionY,
				]);

				// Update state with the final corrected matrix
				dispatch({
					type: "setMatrix",
					payload: { matrix: targetMatrix, rect: mouse.bounds },
				});

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
		wheelEvent.preventDefault(); // stop the page scrolling
		wheelEvent.stopPropagation(); // stop the event from bubbling up

		const { deltaY } = wheelEvent;

		if (containerRef.current === null || deltaY === 0) {
			return;
		}

		// Get current mouse position in component space
		mouse.pos = getXY(containerRef.current, wheelEvent);
		// Convert current mouse position to chart space to use as zoom origin
		mouse.realPos = convertComponentsSpaceToChartSpace(
			mouse.pos, // <-- Use current position, not clickPos
			variables.matrix,
		);

		// Calculate scale factor (exponential)
		const scaleAmount = 1.05; // Adjust for desired sensitivity
		const scaleFactor = deltaY < 0 ? scaleAmount : 1 / scaleAmount;

		scaleView({ x: scaleFactor, y: scaleFactor }, mouse.realPos);
	};

	const scaleView = (factor: Vector, origin: Vector) => {
		// origin is in chart space
		if (containerRef.current === null) {
			return;
		}
		mouse.bounds = containerRef.current.getBoundingClientRect();

		// Create the scaling transformation matrix centered around the origin
		const scaleTransform = new DOMMatrix()
			.translate(origin.x, origin.y)
			.scale(factor.x, factor.y)
			.translate(-origin.x, -origin.y);

		// Apply the scaling transformation to the *current* view matrix from state
		const newMatrix = scaleTransform.multiply(state.matrix);

		// Update state
		dispatch({
			type: "setMatrix",
			payload: { matrix: newMatrix, rect: mouse.bounds },
		});
	};

	// translateView adds a SCREEN SPACE vector to the matrix's translation component
	const translateView = (screenSpaceVector: Vector) => {
		if (containerRef.current === null) {
			return;
		}
		// Apply screen translation by adjusting matrix components e and f
		const currentMatrix = state.matrix;
		const newMatrix = new DOMMatrix([
			currentMatrix.a,
			currentMatrix.b,
			currentMatrix.c,
			currentMatrix.d,
			currentMatrix.e + screenSpaceVector.x, // Add screen X delta
			currentMatrix.f + screenSpaceVector.y, // Add screen Y delta
		]);

		// Update state
		mouse.bounds = containerRef.current.getBoundingClientRect(); // Update bounds if needed
		dispatch({
			type: "setMatrix",
			payload: { matrix: newMatrix, rect: mouse.bounds },
		});
	};

	const handleKeyPress = (event: React.KeyboardEvent) => {
		if (event.ctrlKey && event.key === "+") {
			// zoom
		} else if (event.key === "y") {
			const newMatrix = new DOMMatrix();
			if (containerRef.current === null) {
				return;
			}
			mouse.bounds = containerRef.current.getBoundingClientRect();

			dispatch({
				type: "setMatrix",
				payload: { matrix: new DOMMatrix(), rect: mouse.bounds },
			});
		}

		event.stopPropagation();
	};

	const handlePointerDown = (event: React.PointerEvent) => {
		if (containerRef.current === null) {
			return;
		}
		mouse.clickPos = getXY(containerRef.current, event);
		// Also store this as the initial position for drag calculations
		mouse.initialScreenClickPos = mouse.clickPos;
		mouse.realClickPos = convertComponentsSpaceToChartSpace(
			mouse.clickPos,
			state.matrix,
		);
		mouse.button = event.button;
		variables.matrix = state.matrix;
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		if (containerRef.current === null) {
			return;
		}
		mouse.button = null;
		variables.matrix = state.matrix;
		variables.isDragging = false;
	};

	const handlePointerOut = (event: React.PointerEvent) => {
		if (containerRef.current === null) {
			return;
		}
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
