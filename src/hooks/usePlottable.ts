export const usePlotable = () => {
	function fitToContainer(canvas: HTMLCanvasElement) {
		// ...then set the internal size to match
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
	}


	function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
    
		const { width, height } = canvas.getBoundingClientRect()
	
		if (canvas.width !== width || canvas.height !== height) {
		  canvas.width = width
		  canvas.height = height
		  return true // here you can return some usefull information like delta width and delta height instead of just true
		  // this information can be used in the next redraw...
		}
	
		return false
	  }

	function resizeCanvas(canvas: HTMLCanvasElement) {
		const { width, height } = canvas.getBoundingClientRect()
		
		if (canvas.width !== width || canvas.height !== height) {
		  const { devicePixelRatio:ratio=1 } = window
		  const context = canvas.getContext('2d') as CanvasRenderingContext2D
		  canvas.width = width*ratio
		  canvas.height = height*ratio
		  context.scale(ratio, ratio)
		  return true
		}
	
		return false
	  }

	  const predraw = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
		context.save()
		resizeCanvasToDisplaySize(canvas)
		const { width, height } = context.canvas
		context.clearRect(0, 0, width, height)
	  }

	function retina(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}
		let { width, height } = canvas.getBoundingClientRect();

		let scale = 1;
		// if(isRetina()){
		width *= 2;
		height *= 2;
		scale = 2;
		// }

		canvas.width = width;
		canvas.height = height;
		ctx.save();
		ctx.setTransform(scale, 0, 0, scale, 0, 0);
		ctx.restore();
	}

	const clearCanvas = (canvas: HTMLCanvasElement | null) => {
		if (canvas === null) return
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// ctx.imageSmoothingEnabled = false;  // SVG rendering is better with smoothing off

		return ctx;
	};

	return { fitToContainer, clearCanvas, retina };
};
enum MouseMode {
	PanMode = 3,
	RectMode = 1,
}

enum Axis {
	XAxis = 0,
	YAxis = 1,
	XYAxes = 2,
}

export default usePlotable;
