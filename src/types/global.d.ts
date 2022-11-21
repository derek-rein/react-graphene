type MousePosition = {
  x: number;
  y: number;
};

type LineData = {
  time: number;
  value: number;
};

type Mouse = {
  clickPos: any;
  realClickPos: any;
  button: number;
  bounds: any;
  pos: any;
  realPos: any;
  x: number;
  y: number;
};

type Vector = {
  x: number;
  y: number;
};

type Orientation = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
// const initialMatrix = [[1, 1, 1],[2, 2, 2],[3, 3, 3]]

type Matrix2D = number[][];

type UTCTimestamp = number; //Nominal<number, "UTCTimestamp">;
