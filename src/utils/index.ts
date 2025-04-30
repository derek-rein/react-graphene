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

/**
 * Calculates a zoom level exponent based on the range distance.
 * Returns the floor of the base-10 logarithm of the distance.
 * e.g., 150 -> 2, 900 -> 2, 1000 -> 3, 0.5 -> -1, 0.05 -> -2
 */
export const zoomLevel = (dist: number): number => {
	if (dist <= 0) return 0; // Avoid log(0) or log(negative)
	return Math.floor(Math.log10(dist));
};

/**
 * Formats a number for display on an axis, using scientific notation
 * for very large or small numbers.
 * @param value The number to format.
 * @param exponent The base-10 exponent representing the approximate scale (e.g., from zoomLevel).
 * @param threshold Controls when to switch to scientific notation (e.g., 10^threshold). Default 6.
 * @returns Formatted string label.
 */
export function formatAxisLabel(
	value: number,
	exponent: number,
	threshold = 6,
): string {
	const absValue = Math.abs(value);

	// Use scientific notation for very large or very small numbers
	if (
		absValue >= 10 ** threshold ||
		(absValue > 0 && absValue <= 10 ** -threshold)
	) {
		return value.toExponential(2);
	}

	// Determine precision based on the exponent of the range/zoom level
	// Show more precision when zoomed in (smaller exponent)
	const precision = Math.max(0, -exponent + 1);

	// Avoid potential floating point issues for numbers very close to zero
	if (Math.abs(value) < 10 ** -(precision + 2)) {
		return (0).toFixed(precision);
	}

	return value.toFixed(precision);
}

export interface GridTickInfo {
	zl: number; // Zoom level exponent
	bounce: number; // Minor tick spacing
	bounce_major: number; // Major tick spacing
	divisions: number; // Number of minor divisions fitting in outerRange
	divisions_major: number; // Number of major divisions fitting in outerRange
	majorTicks: number[]; // Array of major tick values
}

/**
 * Calculates grid tick positions and spacing based on visible range and outer bounds.
 * @param range The visible range (e.g., height - y or width - x).
 * @param origin The starting value of the outer range (e.g., oy or ox).
 * @param outerRange The total range of the axis (e.g., Math.abs(oy - oh) or Math.abs(ox - ow)).
 * @returns GridTickInfo object.
 */
export function calculateGridTicks(
	range: number,
	origin: number,
	outerRange: number,
): GridTickInfo {
	// Target number of major ticks visible in the current range
	const targetTicks = 8; // Aim for roughly 8 major ticks
	if (range <= 0) {
		// Avoid division by zero or log errors if range is invalid
		return {
			zl: 0,
			bounce: 1,
			bounce_major: 1,
			divisions: 0,
			divisions_major: 0,
			majorTicks: [],
		};
	}
	const idealSpacing = range / targetTicks;

	// Calculate the exponent and magnitude of the ideal spacing
	const exponent = Math.floor(Math.log10(idealSpacing));
	const magnitude = 10 ** exponent;

	// Find the residual factor (how far into the magnitude we are)
	const residual = idealSpacing / magnitude;

	// Snap to the nearest "nice" multiplier (1, 2, 5) times the magnitude
	let niceFactor: number;
	if (residual < 1.5) {
		niceFactor = 1;
	} else if (residual < 3.5) {
		niceFactor = 2;
	} else if (residual < 7.5) {
		niceFactor = 5;
	} else {
		niceFactor = 10; // This effectively moves to the next magnitude (1 * 10**(exponent+1))
	}
	const bounce_major = niceFactor * magnitude;

	// Ensure bounce is not zero or excessively small
	const safe_bounce_major = Math.max(bounce_major, Number.EPSILON * 1000);
	// Minor ticks can be 1/5th of major ticks (adjust divisor for more/less minor ticks)
	const bounce = safe_bounce_major / 5;
	const safe_bounce = Math.max(bounce, Number.EPSILON * 100);

	// Calculate the zoom level exponent based on the chosen *major* spacing for label formatting
	const zl_for_labels = Math.floor(Math.log10(safe_bounce_major));

	// Calculate major tick values based on the outer range and chosen spacing
	const majorTicks: number[] = [];
	if (safe_bounce_major <= 0) {
		// Prevent infinite loops if spacing is invalid
		return {
			zl: zl_for_labels,
			bounce: safe_bounce,
			bounce_major: safe_bounce_major,
			divisions: 0,
			divisions_major: 0,
			majorTicks: [],
		};
	}

	// Find the first tick position >= the effective origin within the outer bounds
	const startTickVal =
		Math.ceil(origin / safe_bounce_major) * safe_bounce_major;
	// Find the last tick position <= the effective end within the outer bounds
	const endTickVal =
		Math.floor((origin + outerRange) / safe_bounce_major) * safe_bounce_major;

	// Generate ticks, extending slightly beyond the calculated start/end for safety
	const numTicksEstimate = Math.round(
		(endTickVal - startTickVal) / safe_bounce_major,
	);
	for (let i = -2; i <= numTicksEstimate + 2; i++) {
		// Iterate a bit beyond estimate
		const tickValue = startTickVal + i * safe_bounce_major;
		// Add ticks that fall within a reasonable range around the outer bounds
		// (This check prevents adding infinite ticks if outerRange is huge/Infinity)
		// We check against origin and origin + outerRange +/- a margin based on spacing.
		if (
			tickValue >= origin - safe_bounce_major * 2 &&
			tickValue <= origin + outerRange + safe_bounce_major * 2
		) {
			majorTicks.push(tickValue);
		}
	}

	// Sort ticks just in case iteration order wasn't perfect (shouldn't be necessary)
	majorTicks.sort((a, b) => a - b);
	// Could potentially filter duplicates here if needed, but shouldn't occur with this logic.

	return {
		zl: zl_for_labels,
		bounce: safe_bounce,
		bounce_major: safe_bounce_major,
		// divisions and divisions_major are less meaningful now, return calculated values or 0
		divisions: outerRange / safe_bounce,
		divisions_major: outerRange / safe_bounce_major,
		majorTicks,
	};
}

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
