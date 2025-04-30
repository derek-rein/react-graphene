import React, { useCallback, useEffect, useRef } from "react";
import "../../scss/common.scss";
import useChartContext from "../../context/chartContext.js";

interface FunctionPlotGLProps {
	func: (x: number) => number;
	color?: string;
	lineWidth?: number;
	resolution?: number; // Points per unit on x-axis
}

// Vertex shader program
const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  uniform mat3 u_matrix;
  
  void main() {
    // Apply the transform matrix (includes chart's transform)
    vec3 transformedPos = u_matrix * vec3(a_position, 1.0);
    
    // Convert from pixel space to clip space (-1 to 1)
    vec2 clipSpace = (transformedPos.xy / transformedPos.z) * 2.0 - 1.0;
    
    // Y coordinate is inverted in WebGL compared to canvas
    gl_Position = vec4(clipSpace.x, -clipSpace.y, 0, 1);
    
    // Set the point size - will be used for line width
    gl_PointSize = 1.0;
  }
`;

// Fragment shader program
const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_color;
  
  void main() {
    gl_FragColor = u_color;
  }
`;

export function FunctionPlotGL({
	func,
	color = "#dc26ac",
	lineWidth = 1,
	resolution = 10, // Default resolution
}: FunctionPlotGLProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const glRef = useRef<WebGLRenderingContext | null>(null);
	const programRef = useRef<WebGLProgram | null>(null);
	const bufferRef = useRef<WebGLBuffer | null>(null);
	const { state } = useChartContext();

	// Track animation frame to avoid multiple renders
	const animationFrameRef = useRef<number | null>(null);
	// Track matrix for render optimization
	const lastMatrixRef = useRef<string | null>(null);

	// Convert color string to WebGL rgba
	const colorToRgba = useCallback(
		(colorStr: string): [number, number, number, number] => {
			// Default fallback color (pink)
			let r = 0.85;
			let g = 0.15;
			let b = 0.67;
			const a = 1.0;

			try {
				// Handle hex color format
				if (colorStr.startsWith("#")) {
					const hex = colorStr.substring(1);
					if (hex.length === 3) {
						r = Number.parseInt(hex[0] + hex[0], 16) / 255;
						g = Number.parseInt(hex[1] + hex[1], 16) / 255;
						b = Number.parseInt(hex[2] + hex[2], 16) / 255;
					} else if (hex.length === 6) {
						r = Number.parseInt(hex.substring(0, 2), 16) / 255;
						g = Number.parseInt(hex.substring(2, 4), 16) / 255;
						b = Number.parseInt(hex.substring(4, 6), 16) / 255;
					}
				}
				// Handle rgb/rgba format (could be expanded)
			} catch (e) {
				console.error("Error parsing color:", e);
			}

			return [r, g, b, a];
		},
		[],
	);

	// Initialize WebGL context and shaders
	const initGL = useCallback(() => {
		if (!canvasRef.current) return false;

		const canvas = canvasRef.current;
		const glContext =
			canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

		if (!glContext) {
			console.error("WebGL not supported");
			return false;
		}

		// Explicitly assert the type after the null check
		const gl = glContext as WebGLRenderingContext; // Already const
		glRef.current = gl;

		// Create shaders
		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

		if (!vertexShader || !fragmentShader) {
			console.error("Unable to create shaders");
			return false;
		}

		// Set shader source and compile
		gl.shaderSource(vertexShader, VERTEX_SHADER_SOURCE);
		gl.shaderSource(fragmentShader, FRAGMENT_SHADER_SOURCE);
		gl.compileShader(vertexShader);
		gl.compileShader(fragmentShader);

		// Check for compilation errors
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(
				"Vertex shader compilation error:",
				gl.getShaderInfoLog(vertexShader),
			);
			return false;
		}
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(
				"Fragment shader compilation error:",
				gl.getShaderInfoLog(fragmentShader),
			);
			return false;
		}

		// Create program and link shaders
		const program = gl.createProgram();
		if (!program) {
			console.error("Unable to create program");
			return false;
		}

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		// Check for linking errors
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Program linking error:", gl.getProgramInfoLog(program));
			return false;
		}

		programRef.current = program;

		// Create vertex buffer
		const buffer = gl.createBuffer();
		if (!buffer) {
			console.error("Unable to create buffer");
			return false;
		}

		bufferRef.current = buffer;

		return true;
	}, []);

	// Main drawing function
	const draw = useCallback(() => {
		if (!canvasRef.current) return;

		// Cancel any pending animation frame
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}

		// Schedule drawing in the next animation frame
		animationFrameRef.current = requestAnimationFrame(() => {
			if (!canvasRef.current) return;

			// Get current matrix as string for comparison
			const currentMatrixString = JSON.stringify([
				Number(state.matrix.a.toFixed(15)),
				Number(state.matrix.b.toFixed(15)),
				Number(state.matrix.c.toFixed(15)),
				Number(state.matrix.d.toFixed(15)),
				Number(state.matrix.e.toFixed(15)),
				Number(state.matrix.f.toFixed(15)),
			]);

			// Skip redraw if matrix hasn't changed
			if (currentMatrixString === lastMatrixRef.current) {
				return;
			}

			// Update last matrix reference
			lastMatrixRef.current = currentMatrixString;

			const canvas = canvasRef.current;
			// Initialize if not already done
			if (!glRef.current || !programRef.current || !bufferRef.current) {
				if (!initGL()) {
					console.error("Failed to initialize WebGL");
					return;
				}
			}

			const gl = glRef.current;
			const program = programRef.current;
			const buffer = bufferRef.current;

			// Make sure the WebGL context is available
			if (!gl || !program || !buffer) {
				console.error("WebGL resources not available");
				return;
			}

			// Resize canvas to match display size
			const displayWidth = canvas.clientWidth;
			const displayHeight = canvas.clientHeight;
			if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
				canvas.width = displayWidth;
				canvas.height = displayHeight;
				gl.viewport(0, 0, canvas.width, canvas.height);
			}

			// Calculate visible area in chart space
			const canvasWidth = canvas.width;
			const canvasHeight = canvas.height;

			// Create corner points in screen space
			const topLeft = new DOMPoint(0, 0);
			const topRight = new DOMPoint(canvasWidth, 0);
			const bottomLeft = new DOMPoint(0, canvasHeight);
			const bottomRight = new DOMPoint(canvasWidth, canvasHeight);

			// Transform to chart space using the inverse of the current matrix
			const inverseMatrix = state.matrix.inverse();
			const tlChart = topLeft.matrixTransform(inverseMatrix);
			const trChart = topRight.matrixTransform(inverseMatrix);
			const blChart = bottomLeft.matrixTransform(inverseMatrix);
			const brChart = bottomRight.matrixTransform(inverseMatrix);

			// Find the x-range that's visible with a margin
			const minX = Math.min(tlChart.x, trChart.x, blChart.x, brChart.x);
			const maxX = Math.max(tlChart.x, trChart.x, blChart.x, brChart.x);

			// Add padding to visible range for smoother rendering at edges
			const xPadding = (maxX - minX) * 0.05;
			const paddedMinX = minX - xPadding;
			const paddedMaxX = maxX + xPadding;

			// Determine step size based on resolution and visible range
			// Adaptive resolution based on zoom level for smooth rendering
			const visibleRange = paddedMaxX - paddedMinX;

			// Calculate optimal step size based on current scale factor
			const scaleFactorX = Math.abs(state.matrix.a);
			// More points at higher zoom levels, fewer at lower zoom
			const adaptiveResolution = resolution * Math.max(1, scaleFactorX * 0.5);
			const pointsToPlot = Math.min(
				Math.round(visibleRange * adaptiveResolution),
				20000,
			);

			const step = visibleRange / pointsToPlot;

			// Generate function points
			const segments: number[][] = [];
			let currentSegment: number[] = [];

			// Maximum Y difference to detect discontinuities
			const yRange = visibleRange * 2;
			const maxYStep = yRange * 5;
			let lastY: number | null = null;

			for (let i = 0; i <= pointsToPlot; i++) {
				const x = paddedMinX + i * step;
				try {
					const y = func(x);

					// Skip NaN or infinite values
					if (Number.isNaN(y) || !Number.isFinite(y)) {
						if (currentSegment.length > 1) {
							segments.push(currentSegment);
							currentSegment = [];
						}
						lastY = null;
						continue;
					}

					// Detect large jumps (discontinuities)
					if (lastY !== null && Math.abs(y - lastY) > maxYStep) {
						if (currentSegment.length > 1) {
							segments.push(currentSegment);
							currentSegment = [];
						}
					}

					currentSegment.push(x, y);
					lastY = y;
				} catch (err) {
					// Handle function evaluation errors
					if (currentSegment.length > 1) {
						segments.push(currentSegment);
						currentSegment = [];
					}
					lastY = null;
				}
			}

			// Add the last segment if it has points
			if (currentSegment.length > 1) {
				segments.push(currentSegment);
			}

			// Clear the canvas
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);

			// Use our shader program
			gl.useProgram(program);

			// Set up attributes and uniforms
			const positionLocation = gl.getAttribLocation(program, "a_position");
			const matrixLocation = gl.getUniformLocation(program, "u_matrix");
			const colorLocation = gl.getUniformLocation(program, "u_color");

			// Set color uniform
			const [r, g, b, a] = colorToRgba(color);
			gl.uniform4f(colorLocation, r, g, b, a);

			// Create matrix based on the chart's matrix (flip y-axis)
			const { a: ma, b: mb, c: mc, d: md, e: me, f: mf } = state.matrix;
			const transformMatrix = [ma, mb, 0, mc, md, 0, me, mf, 1];

			gl.uniformMatrix3fv(matrixLocation, false, transformMatrix);

			// Draw each segment separately
			for (const segment of segments) {
				if (segment.length < 4) continue; // Need at least 2 points to draw a line

				gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
				gl.bufferData(
					gl.ARRAY_BUFFER,
					new Float32Array(segment),
					gl.STATIC_DRAW,
				);
				gl.enableVertexAttribArray(positionLocation);
				gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

				// Set line width (note: WebGL has limited line width support)
				gl.lineWidth(Math.min(lineWidth, 10)); // Most WebGL implementations cap at 10

				// Draw lines
				gl.drawArrays(gl.LINE_STRIP, 0, segment.length / 2);
			}

			// Clear the animation frame reference
			animationFrameRef.current = null;
		});
	}, [state.matrix, func, color, lineWidth, resolution, initGL, colorToRgba]);

	// Trigger redraw when dependencies change
	useEffect(() => {
		draw();
	}, [draw]);

	// Set up cleanup on unmount
	useEffect(() => {
		return () => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
			}

			// Clean up WebGL resources
			if (glRef.current && programRef.current) {
				const gl = glRef.current;
				gl.deleteProgram(programRef.current);

				if (bufferRef.current) {
					gl.deleteBuffer(bufferRef.current);
				}
			}
		};
	}, []);

	// Add CSS to ensure plot is visible above grid
	useEffect(() => {
		if (canvasRef.current) {
			canvasRef.current.style.zIndex = "10";
		}
	}, []);

	return <canvas className="function-plot function-plot-gl" ref={canvasRef} />;
}

export default FunctionPlotGL;
