import type React from "react";

const { abs, max, min, sqrt } = Math;

export const isSsr = typeof window === "undefined";

export const isMac = isSsr ? false : /(Mac)/i.test(navigator.platform);

const cancelEvent = (event: React.SyntheticEvent): void => {
	event.stopPropagation();
	event.preventDefault();
};

const getDistance = (a: DOMPoint, b: DOMPoint): number => {
	const x = a.x - b.x;
	const y = a.y - b.y;

	return sqrt(x * x + y * y);
};

export const EMPTY_VECTOR = { x: 0, y: 0 };

export const convertComponentsSpaceToChartSpace = (
	position: MousePosition,
	matrix: DOMMatrix,
): Vector => {
	const newMatrix = matrix.inverse(); // .inverse()
	const point = newMatrix.transformPoint(new DOMPoint(position.x, position.y));
	return { x: point.x, y: point.y };
};

export function getXY(
	canvas: HTMLCanvasElement | HTMLDivElement,
	event: React.MouseEvent,
): MousePosition {
	const rect = canvas.getBoundingClientRect(); // absolute position of canvas
	return {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top,
	};
}

export function roundup(v: number) {
	return (
		((v >= 0 || -1) as number) * 10 ** (1 + Math.floor(Math.log10(Math.abs(v))))
	);
}

export function nearest(n: number, zoomLevel: number) {
	const pow = 10 ** zoomLevel;
	let val = n / pow;
	val = (val < 0 ? Math.floor(val) : Math.ceil(val)) * pow;
	return val;
}

export const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

export const zoomLevel = (dist: number) => {
	const length = (Math.log(Math.abs(dist)) * Math.LOG10E + 1) | 0;
	return length;
};

function roundOut(v: number) {
	// round value out to the nearest factor of current zoom level
	if (v === 0) return v;
	const level = 10 ** Math.floor(Math.log10(Math.abs(v)));
	console.log(`level: ${level}`);
	return Math.ceil(Math.abs(v) / level) * level * (v <= 0 ? -1 : 1);
}

export function roundFloor(v: number, level: number) {
	if (v === 0) return v;
	// let level = Math.pow(10, Math.floor(Math.log10(Math.abs(v))))
	return Math.floor(Math.abs(v) / level) * level * (v <= 0 ? -1 : 1);
}

export function roundCeil(v: number, level: number) {
	if (v === 0) return v;
	// let level = Math.pow(10, Math.floor(Math.log10(Math.abs(v))))
	return Math.ceil(Math.abs(v) / level) * level * (v <= 0 ? -1 : 1);
}

const convertAlpha = (value: number): string => {
	try {
		return `${(clamp(value, 0, 1) * 256).toString(16).split(".")[0]}`;
	} catch {
		return "00";
	}
};
