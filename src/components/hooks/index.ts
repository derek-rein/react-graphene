import { useRef } from "react";
import { EMPTY_VECTOR, getXY } from "../../utils";
import { IMouse, IVariables } from "./types";

export const usePlotable = () => {





    function fitToContainer(canvas: HTMLCanvasElement){
      // ...then set the internal size to match
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }






    function retina(canvas: HTMLCanvasElement) {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      let {width, height} = canvas.getBoundingClientRect();

      var scale = 1;
      // if(isRetina()){
      width *= 2;
      height *= 2;
      scale = 2;
      // }
  
      canvas.width = width;
      canvas.height = height;
      ctx.save()
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.restore()

    }

    

  const clearCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.imageSmoothingEnabled = false;  // SVG rendering is better with smoothing off

    return ctx
  }

  
    return {fitToContainer, clearCanvas, retina}
  
  }
  enum MouseMode {
    PanMode = 3,
    RectMode = 1
  }
  
  enum Axis {
    XAxis = 0,
    YAxis = 1,
    XYAxes = 2
  }

  
  export { default } from "../hooks/chartContext";