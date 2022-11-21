import React, { forwardRef, useEffect, useRef } from 'react';
import '../../scss/common.scss';
import useChartContext from '../hooks/chartContext';
import usePlotable from '../hooks/usePlottable';

const drawAxis = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
	// draw origin
	ctx.moveTo(-100 + x, 0 + y);
	ctx.lineTo(100 + x, 0 + y);
	ctx.moveTo(0 + x, 100 + y);
	ctx.lineTo(0 + x, -100 + y);
};

interface ILineGraph {
	data: LineData[];
}

export type CountdownHandle = {
	fit: () => void;
};

type Props = {
	data: LineData[];
};

const PlotLine = forwardRef<CountdownHandle, Props>(({ data }, ref) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const { state, dispatch, mouse } = useChartContext();
	const { fitToContainer, clearCanvas } = usePlotable();

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas!.getContext('2d');
		if (!ctx) {
			return;
		}
		if (!canvas) {
			return;
		}
		fitToContainer(canvas);
		// draw()
	}, []);

	const draw = () => {
		if (!canvasRef.current) {
			return;
		}
		const canvas = canvasRef.current;
		const ctx = clearCanvas(canvas);
		if (!ctx) {
			return;
		}

		ctx.strokeStyle = '#26dc57';

		// ctx.resetTransform()

		ctx.save(); // save context without transformation

		ctx.setTransform(state?.matrix);

		ctx.beginPath();
		ctx.moveTo(data[0].time, data[0].value);
		data.map((row, index) => {
			ctx.lineTo(row.time, row.value);
		});

		// draw origin
		// drawAxis(ctx, 0, 0)
		if (mouse.realClickPos.x) {
			ctx.strokeStyle = '#dc26ac';
			drawAxis(ctx, mouse.realClickPos.x, mouse.realClickPos.y);
		}

		ctx.restore();
		ctx.stroke();
	};

	useEffect(() => {
		try {
			draw();
		} catch (err) {
			console.log(err);
		}
	}, [state?.matrix]);

	React.useImperativeHandle(ref, () => ({
		// start() has type inferrence here
		fit() {
			const canvas = canvasRef.current;
			const ctx = canvas!.getContext('2d');
			if (!ctx) {
				return;
			}
			if (!canvas) {
				return;
			}
			fitToContainer(canvas);
			draw();
		},
	}));

	return <canvas ref={canvasRef} />;
});

PlotLine.displayName = 'PlotLine';

export default PlotLine;
