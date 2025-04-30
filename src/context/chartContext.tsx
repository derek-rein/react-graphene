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
		if (containerRef.current === null || mouse.button === null) {
			return;
		}

		variables.isDragging = true;
		mouse.bounds = containerRef.current.getBoundingClientRect();
		mouse.pos = getXY(containerRef.current, event);

		// We need the initial matrix state stored at pointer down
		const initialMatrix = variables.matrix;
		// We need the initial screen click position
		const screenOriginStart = mouse.initialScreenClickPos;
		// We need the initial chart coordinate click position
		const chartOrigin = mouse.realClickPos;

		if (!initialMatrix || !screenOriginStart || !chartOrigin) {
			// Should not happen if pointerdown logic is correct, but safety check
			console.warn("Missing initial state for drag operation");
			return;
		}

		switch (mouse.button) {
			case 0: {
				// Left Mouse Button: Translation
				// Calculate the total screen space delta since the drag started
				const totalScreenDeltaX = mouse.pos.x - screenOriginStart.x;
				const totalScreenDeltaY = mouse.pos.y - screenOriginStart.y;

				// Get the device pixel ratio
				const dpr = window.devicePixelRatio || 1;

				// Create the target matrix by adding the total screen delta
				// (scaled by DPR) to the *initial* matrix's translation components (e, f).
				const targetMatrix = new DOMMatrix([
					initialMatrix.a,
					initialMatrix.b,
					initialMatrix.c,
					initialMatrix.d,
					initialMatrix.e + totalScreenDeltaX * dpr,
					initialMatrix.f + totalScreenDeltaY * dpr,
				]);

				// Update state with the calculated target matrix
				dispatch({
					type: "setMatrix",
					payload: { matrix: targetMatrix, rect: mouse.bounds },
				});
				break;
			}
			case 1: {
				// Middle Mouse Button: Scaling
				// Ensure we have initial state
				if (
					!mouse.initialScreenClickPos ||
					!mouse.realClickPos ||
					!variables.matrix
				) {
					console.warn("Missing initial state for middle-click scaling");
					break;
				}
				variables.isDragging = true;

				const sensitivity = 500;
				const totalDeltaX = mouse.pos.x - mouse.initialScreenClickPos.x;
				const totalDeltaY = mouse.pos.y - mouse.initialScreenClickPos.y;

				// Prevent action on zero delta
				const tolerance = 0.1;
				if (
					Math.abs(totalDeltaX) < tolerance &&
					Math.abs(totalDeltaY) < tolerance
				) {
					break;
				}

				// Linear scale factor based on total screen delta
				const scaleX = 1.0 + totalDeltaX / sensitivity;
				const scaleY = 1.0 + totalDeltaY / sensitivity;
				const safeScaleX = Math.max(0.01, scaleX);
				const safeScaleY = Math.max(0.01, scaleY);

				const initialMatrix = variables.matrix;
				const chartOrigin = mouse.realClickPos; // Chart space origin
				const screenOriginStart = mouse.initialScreenClickPos; // Target screen pos for chartOrigin

				// 1. Create scaling transform centered around chartOrigin
				const scaleTransform = new DOMMatrix()
					.translate(chartOrigin.x, chartOrigin.y)
					.scale(safeScaleX, safeScaleY)
					.translate(-chartOrigin.x, -chartOrigin.y);

				// 2. Apply scaling to the initial matrix state
				const scaledMatrix = scaleTransform.multiply(initialMatrix);

				// 3. Find current SCREEN position (CSS Pixels) of the chartOrigin using the scaledMatrix
				//    (Transform chart point -> canvas rendering point -> screen CSS point)
				const chartOriginPoint = new DOMPoint(chartOrigin.x, chartOrigin.y);
				const canvasRenderingOriginAfterScale =
					chartOriginPoint.matrixTransform(scaledMatrix);
				const dpr = window.devicePixelRatio || 1;
				const screenOriginAfterScaleCSS = {
					x: canvasRenderingOriginAfterScale.x / dpr,
					y: canvasRenderingOriginAfterScale.y / dpr,
				};

				// 4. Calculate correction needed in SCREEN SPACE (CSS Pixels)
				const correctionX_CSS =
					screenOriginStart.x - screenOriginAfterScaleCSS.x;
				const correctionY_CSS =
					screenOriginStart.y - screenOriginAfterScaleCSS.y;

				// 5. Create the final target matrix: Apply the CSS correction scaled by DPR
				//    to the translation components (e, f) of the scaledMatrix
				const targetMatrix = new DOMMatrix([
					scaledMatrix.a,
					scaledMatrix.b,
					scaledMatrix.c,
					scaledMatrix.d,
					scaledMatrix.e + correctionX_CSS * dpr,
					scaledMatrix.f + correctionY_CSS * dpr,
				]);

				// Update state
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
		wheelEvent.preventDefault();
		wheelEvent.stopPropagation();

		const { deltaY } = wheelEvent;

		if (containerRef.current === null || deltaY === 0) {
			return;
		}

		// --- Get Initial State for this discrete event ---
		const initialMatrix = state.matrix;
		// Get current mouse position in screen space (CSS pixels)
		const screenOrigin = getXY(containerRef.current, wheelEvent);
		// Calculate corresponding canvas rendering position (Physical Pixels)
		const dpr = window.devicePixelRatio || 1;
		const canvasRenderingOrigin = {
			x: screenOrigin.x * dpr,
			y: screenOrigin.y * dpr,
		};
		// Convert screen origin (CSS) to chart space origin using the initial matrix
		const chartOrigin = convertComponentsSpaceToChartSpace(
			screenOrigin,
			initialMatrix,
		);

		// Update mouse state
		mouse.pos = screenOrigin;
		mouse.realPos = chartOrigin;

		// Calculate scale factor
		const scaleAmount = 1.05;
		const scaleFactor = wheelEvent.deltaY < 0 ? scaleAmount : 1 / scaleAmount;
		const factor = { x: scaleFactor, y: scaleFactor };

		// --- Apply scaling and corrective translation ---

		// 1. Create scaling transformation centered around chartOrigin
		const scaleTransform = new DOMMatrix()
			.translate(chartOrigin.x, chartOrigin.y)
			.scale(factor.x, factor.y)
			.translate(-chartOrigin.x, -chartOrigin.y);

		// 2. Apply scaling to the initial matrix state
		const scaledMatrix = scaleTransform.multiply(initialMatrix);

		// 3. Find where chartOrigin would land in *canvas rendering coordinates* after scaling
		const chartOriginPoint = new DOMPoint(chartOrigin.x, chartOrigin.y);
		const canvasRenderingOriginAfterScale =
			chartOriginPoint.matrixTransform(scaledMatrix);

		// 4. Calculate screen space correction needed in *canvas rendering coordinates*
		const correctionX =
			canvasRenderingOrigin.x - canvasRenderingOriginAfterScale.x;
		const correctionY =
			canvasRenderingOrigin.y - canvasRenderingOriginAfterScale.y;

		// 5. Create the final target matrix by applying the correction
		const targetMatrix = new DOMMatrix([
			scaledMatrix.a,
			scaledMatrix.b,
			scaledMatrix.c,
			scaledMatrix.d,
			scaledMatrix.e + correctionX,
			scaledMatrix.f + correctionY,
		]);

		// Update state
		mouse.bounds = containerRef.current.getBoundingClientRect();
		dispatch({
			type: "setMatrix",
			payload: { matrix: targetMatrix, rect: mouse.bounds },
		});
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
		} else if (event.key === "r") {
			// Reset matrix to identity
			const newMatrix = new DOMMatrix();
			if (containerRef.current === null) {
				return;
			}
			// Get current bounds for the payload (though reducer now uses state.canvasSize)
			mouse.bounds = containerRef.current.getBoundingClientRect();

			dispatch({
				type: "setMatrix",
				payload: { matrix: newMatrix, rect: mouse.bounds },
			});
		}

		event.stopPropagation();
	};

	const handlePointerDown = (event: React.PointerEvent) => {
		if (containerRef.current === null) {
			return;
		}
		// Get screen position in CSS pixels
		const screenPos = getXY(containerRef.current, event);
		mouse.clickPos = screenPos;
		mouse.initialScreenClickPos = { ...screenPos }; // Store initial screen pos (CSS pixels)

		// Calculate initial canvas rendering position (Physical Pixels)
		const dpr = window.devicePixelRatio || 1;
		mouse.initialCanvasRenderingClickPos = {
			x: screenPos.x * dpr,
			y: screenPos.y * dpr,
		};

		// IMPORTANT: Create and store a snapshot of the matrix at pointer down
		const initialMatrixSnapshot = new DOMMatrix(state.matrix.toString());
		variables.matrix = initialMatrixSnapshot; // Store snapshot for use in pointermove

		// Calculate the initial chart space position using the SAME snapshot
		mouse.realClickPos = convertComponentsSpaceToChartSpace(
			mouse.clickPos, // Use CSS pixel position
			initialMatrixSnapshot, // Use the snapshot!
		);

		mouse.button = event.button;
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
