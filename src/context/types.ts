import type { Dispatch } from "react";
import type { Actions } from "./reducer";

export type StateChart = {
	matrix: DOMMatrix;
	matrix_x: DOMMatrix;
	matrix_y: DOMMatrix;
	bounds: DOMRect;
	outerBounds: DOMRect;
	canvasSize: DOMRect;
};

export interface IMouse {
	clickPos: Vector; // location on mouse down in component space (CSS pixels)
	pos: Vector; // current mouse in component space (CSS pixels)
	bounds?: DOMRect;
	realPos: Vector; // where the mouse is in data space
	realClickPos: Vector; // where the mouse started in data space
	button: number | null; // which button is pressed
	initialScreenClickPos?: Vector; // screen position at drag start (CSS pixels)
	initialCanvasRenderingClickPos?: Vector; // canvas rendering position at drag start (Physical pixels)
}

export interface IVariables {
	matrix: DOMMatrix;
	isDragging: boolean;
}

export interface InitContextProps {
	state: StateChart;
	mouse: IMouse;
	variables: IVariables;
	dispatch: Dispatch<Actions>;
	matrix: DOMMatrix;
	scaleView(vector: Vector, origin: MousePosition): void;
	translateView(vector: Vector): void;

	// generateId(): number
	// calculateStats(fills: Fill[]): ReturnType<typeof calculateFillStats>
}
