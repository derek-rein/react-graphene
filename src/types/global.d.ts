type MousePosition = {
	x: number;
	y: number;
};

type LineData = {
	time: number;
	value: number;
};

type Mouse = {
	clickPos: MousePosition; // Screen coordinates
	realClickPos: Vector; // Chart coordinates
	button: number | null; // Mouse button pressed (null if none)
	bounds: DOMRect | undefined; // Bounding rect of the container element
	pos: MousePosition; // Current screen coordinates
	realPos: Vector; // Current chart coordinates
};

type Vector = {
	x: number;
	y: number;
};

type Orientation = "TOP" | "BOTTOM" | "LEFT" | "RIGHT";
// const initialMatrix = [[1, 1, 1],[2, 2, 2],[3, 3, 3]]

type Matrix2D = number[][];

type UTCTimestamp = number; //Nominal<number, "UTCTimestamp">;
