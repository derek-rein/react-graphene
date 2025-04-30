import React, { useCallback, useEffect, useRef } from "react";

export function TouchComponent() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const draw = useCallback((ctx: CanvasRenderingContext2D) => {
		ctx.fillStyle = "#000000";
		ctx.beginPath();
		ctx.arc(50, 100, 20, 0, 2 * Math.PI);
		ctx.fill();
	}, []);

	useEffect(() => {
		const canvas = canvasRef?.current;
		if (canvas == null) return;
		const context = canvas.getContext("2d");
		if (context === null) return;

		//Our draw come here
		draw(context);
	}, [draw]);

	return <canvas ref={canvasRef} />;
}
