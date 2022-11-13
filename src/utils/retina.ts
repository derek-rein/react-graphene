export function isRetina() {
  // source https://en.wikipedia.org/wiki/Retina_Display#Models
  const knownRetinaResolutions = [
    [272, 340],
    [312, 390],
    [960, 640],
    [1136, 640],
    [1334, 750],
    [1920, 1080],
    [2048, 1536],
    [2732, 2048],
    [2304, 1440],
    [2560, 1600],
    [2880, 1800],
    [4096, 2304],
    [5120, 2880],
  ];
  const knownPhones = [
    [960, 640],
    [1136, 640],
    [1334, 750],
    [1920, 1080],
  ];
  const knownPads = [
    [2048, 1536],
    [2732, 2048],
  ];
  const knownBooks = [
    [2304, 1440],
    [2560, 1600],
    [2880, 1800],
    [4096, 2304],
    [5120, 2880],
  ];

  const hasRetinaRes = knownRetinaResolutions.some(
    (known) => known[0] === screen.width && known[1] === screen.height
  );
  const isACrapple =
    /(iPhone|iPad|iPod|Mac OS X|MacPPC|MacIntel|Mac_PowerPC|Macintosh)/.test(
      navigator.userAgent
    );
  const hasPhoneRes = knownPhones.some(
    (known) => known[0] === screen.width && known[1] === screen.height
  );
  const isPhone = /iPhone/.test(navigator.userAgent);
  const hasPadRes = knownPads.some(
    (known) => known[0] === screen.width && known[1] === screen.height
  );
  const isPad = /iPad/.test(navigator.userAgent);
  const hasBookRes = knownBooks.some(
    (known) => known[0] === screen.width && known[1] === screen.height
  );
  const isBook = /Mac OS X|MacPPC|MacIntel|Mac_PowerPC|Macintosh/.test(
    navigator.userAgent
  );

  const isAgentMatchingRes =
    (isBook && hasBookRes && !isPad && !isPhone) ||
    (isPad && hasPadRes && !isBook && !isPhone) ||
    (isPhone && hasPhoneRes && !isBook && !isPad);

  return (
    devicePixelRatio >= 2 && isACrapple && hasRetinaRes && isAgentMatchingRes
  );
}

export function modifyContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  let { width, height } = canvas.getBoundingClientRect();
  let scale = 1;
  // if(isRetina()){
  width *= 2;
  height *= 2;
  scale = 2;
  // }

  canvas.width = width;
  canvas.height = height;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false; // SVG rendering is better with smoothing off

  return ctx;
}
