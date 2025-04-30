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
	clickPos: MousePosition; // location on mouse down in component space
	pos: MousePosition; // mouse in component space
	bounds?: DOMRect;
	realPos: Vector; // where the mouse is in data space
	realClickPos: Vector; // where the mouse is in data space
	button: number | null; // which button is pressed
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
