import { format } from "date-fns";
import fromUnixTime from "date-fns/fromUnixTime";

const MS_SPACING = 1 / 1000.0;
const SECOND_SPACING = 1;
const MINUTE_SPACING = 60;
const HOUR_SPACING = 3600;
const DAY_SPACING = 24 * HOUR_SPACING;
// const WEEK_SPACING = 7 * DAY_SPACING;
const MONTH_SPACING = 30 * DAY_SPACING;
const YEAR_SPACING = 365 * DAY_SPACING;

const MIN_REGULAR_TIMESTAMP =
  new Date(1, 1, 1).getTime() / 1000 - new Date(1970, 1, 1).getTime() / 1000;
const MAX_REGULAR_TIMESTAMP =
  new Date(9999, 1, 1).getTime() / 1000 - new Date(1970, 1, 1).getTime() / 1000;
// const SEC_PER_YEAR = 365.25 * 24 * 3600;

export const epochToString = (epoch: number): string => {
  // factor in zoom level
  try {
    return format(fromUnixTime(epoch * 1000), "yy-MM-dd HH:MM:SS");
  } catch {
    return "---";
  }
};

const utcfromtimestamp = (val: number) =>
  // date takes milliseconds
  // https://stackoverflow.com/questions/4631928/convert-utc-epoch-to-local-date
  new Date(val * 1000);
type Stepper = (val: number, n: number, first: boolean) => number;

function makeMSStepper(stepSize: number): Stepper {
  function stepper(val: number, n: number, first: boolean) {
    if (val < MIN_REGULAR_TIMESTAMP || val > MAX_REGULAR_TIMESTAMP) {
      return Infinity;
    }

    if (first) {
      val *= 1000;
      const f = stepSize * 1000;
      return (Math.floor(val / (n * f) + 1) * (n * f)) / 1000.0;
    }
    return val + n * stepSize;
  }
  return stepper;
}

function makeSStepper(stepSize: number): Stepper {
  function stepper(val: number, n: number, first: boolean) {
    if (val < MIN_REGULAR_TIMESTAMP || val > MAX_REGULAR_TIMESTAMP) {
      return Infinity;
    }
    if (first) {
      return Math.floor(val / (n * stepSize) + 1) * (n * stepSize);
    }
    return val + n * stepSize;
  }
  return stepper;
}

function makeMStepper(stepSize: number): Stepper {
  function stepper(val: number, n: number, first: boolean) {
    if (val < MIN_REGULAR_TIMESTAMP || val > MAX_REGULAR_TIMESTAMP) {
      return Infinity;
    }

    const d = utcfromtimestamp(val);
    const base0m = d.getUTCMonth() + n * stepSize - 1;
    const d2 = new Date(
      d.getUTCFullYear() + Math.floor(base0m / 12),
      (base0m % 12) + 1,
      1
    );
    return d2.getTime() / 1000 - new Date(1970, 1, 1).getTime() / 1000;
  }
  return stepper;
}
function makeYStepper(stepSize: number): Stepper {
  function stepper(val: number, n: number, first: boolean) {
    if (val < MIN_REGULAR_TIMESTAMP || val > MAX_REGULAR_TIMESTAMP) {
      return Infinity;
    }
    const d = utcfromtimestamp(val);
    const next_year =
      Math.floor(d.getUTCFullYear() / (n * stepSize) + 1) * (n * stepSize);
    if (next_year > 9999) { return Infinity; }
    const next_date = new Date(next_year, 1, 1);
    return next_date.getTime() / 1000 - new Date(1970, 1, 1).getTime() / 1000;
  }
  return stepper;
}

class TickSpec {
  spacing: number;

  step: Stepper;

  format: string;

  autoSkip: null | number[];

  /* Specifies the properties for a set of date ticks and computes ticks
    within a given utc timestamp range */
  constructor(
    spacing: number,
    stepper: Stepper,
    format: string,
    autoSkip: number[] | null = null
  ) {
    /*
      ============= ==========================================================
      Arguments
      spacing       approximate (average) tick spacing
      stepper       a stepper function that takes a utc time stamp and a step
      steps number n to compute the start of the next unit. You
      can use the make_X_stepper functions to create common
      steppers.
      format        a strftime compatible format string which will be used to
      convert tick locations to date/time strings
      autoSkip      list of step size multipliers to be applied when the tick
      density becomes too high. The tick spec automatically
      applies additional powers of 10 (10, 100, ...) to the list
      if necessary. Set to None to switch autoSkip off
      ============= ==========================================================
      */
    this.spacing = spacing;
    this.step = stepper;
    this.format = format;
    this.autoSkip = autoSkip;
  }

  makeTicks(
    minVal: number,
    maxVal: number,
    minSpc: number
  ): [number[], number] {
    const ticks: number[] = [];
    const n = this.skipFactor(minSpc);
    let x = this.step(minVal, n, true);

    while (x <= maxVal) {
      ticks.push(x);
      x = this.step(x, n, false);
    }

    return [ticks, n];
  }

  skipFactor(minSpc: number) {
    let spc: number;

    if (this.autoSkip === null || minSpc < this.spacing) {
      return 1;
    }

    const factors = this.autoSkip;

    while (true) {
      // not sure if this is translated
      for (
        var f: number, _pj_c = 0, _pj_a = factors, _pj_b = _pj_a.length;
        _pj_c < _pj_b;
        _pj_c += 1
      ) {
        f = _pj_a[_pj_c];
        spc = this.spacing * f;

        if (spc > minSpc) {
          return f;
        }
      }

      factors.reduce((a, b) => (a *= 10), 1);
    }
  }
}

export class ZoomLevel {
  tickSpecs: TickSpec[];

  utcOffset: number;

  exampleText: string;

  /*  Generates the ticks which appear in a specific zoom level  */
  constructor(tickSpecs: TickSpec[], exampleText: string) {
    /*
      ============= ==========================================================
      tickSpecs     a list of one or more TickSpec objects with decreasing
      coarseness
      ============= ==========================================================
      */
    this.tickSpecs = tickSpecs;
    this.utcOffset = 0;
    this.exampleText = exampleText;
  }

  tickValues(minVal: number, maxVal: number, minSpc: number) {
    // # return tick values for this format in the range minVal, maxVal
    // # the return value is a list of tuples (<avg spacing>, [tick positions])
    // # minSpc indicates the minimum spacing (in seconds) between two ticks
    // # to fullfill the maxTicksPerPt constraint of the DateAxisItem at the
    // # current zoom level. This is used for auto skipping ticks.

    const valueSpecs: [number, number[]][] = [];
    const allTicks: number[] = [];
    //   # back-project (minVal maxVal) to UTC, compute ticks then offset to
    //   # back to local time again

    const utcMin = minVal - this.utcOffset;
    const utcMax = maxVal - this.utcOffset;

    for (
      var spec: TickSpec,
        _pj_c = 0,
        _pj_a = this.tickSpecs,
        _pj_b = _pj_a.length;
      _pj_c < _pj_b;
      _pj_c += 1
    ) {
      spec = _pj_a[_pj_c];
      const [ticks, skipFactor] = spec.makeTicks(utcMin, utcMax, minSpc);
      // reposition tick labels to local time coordinates
      ticks.reduce((a, b) => (a += this.utcOffset));
      // remove any ticks that were present in higher levels
      const tick_list = ticks.filter((t) => !allTicks.includes(t));
      allTicks.push(...tick_list);
      valueSpecs.push([spec.spacing, tick_list]);
      // # if we're skipping ticks on the current level there's no point in
      // # producing lower level ticks

      if (skipFactor > 1) {
        break;
      }
    }

    //   this.tickSpecs.map((spec, i) => {
    //     let [ticks, skipFactor] = spec.makeTicks(utcMin, utcMax, minSpc);
    //     ticks.reduce((a,b) => a+=this.utcOffset)

    //     if (skipFactor > 1) {
    //         break;
    //     }

    //   for (var spec, _pj_c = 0, _pj_a = this.tickSpecs, _pj_b = _pj_a.length; _pj_c < _pj_b; _pj_c += 1) {

    //     var tick_list

    //     spec = _pj_a[_pj_c];
    //     const [ticks, skipFactor] = spec.makeTicks(utcMin, utcMax, minSpc);
    //     ticks += this.utcOffset;

    //     tick_list = function () {
    //       var _pj_d = [],
    //           _pj_e = ticks.tolist();

    //       for (var _pj_f = 0, _pj_g = _pj_e.length; _pj_f < _pj_g; _pj_f += 1) {
    //         var x = _pj_e[_pj_f];

    //         if (!_pj.in_es6(x, allTicks)) {
    //           _pj_d.push(x);
    //         }
    //       }

    //       return _pj_d;
    //     }.call(this);

    //     allTicks.extend(tick_list);
    //     valueSpecs.append([spec.spacing, tick_list]);

    //     if (skipFactor > 1) {
    //       break;
    //     }
    //   }

    return valueSpecs;
  }
}

export const YEAR_MONTH_ZOOM_LEVEL = new ZoomLevel(
  [
    new TickSpec(YEAR_SPACING, makeYStepper(1), "%Y", [1, 5, 10, 25]),
    new TickSpec(MONTH_SPACING, makeMStepper(1), "%b"),
  ],
  "YYYY"
);

export const MONTH_DAY_ZOOM_LEVEL = new ZoomLevel(
  [
    new TickSpec(MONTH_SPACING, makeMStepper(1), "%b"),
    new TickSpec(DAY_SPACING, makeSStepper(DAY_SPACING), "%d", [1, 5]),
  ],
  "MMM"
);

export const DAY_HOUR_ZOOM_LEVEL = new ZoomLevel(
  [
    new TickSpec(DAY_SPACING, makeSStepper(DAY_SPACING), "%a %d"),
    new TickSpec(HOUR_SPACING, makeSStepper(HOUR_SPACING), "%H:%M", [1, 6]),
  ],
  "MMM 00"
);

export const HOUR_MINUTE_ZOOM_LEVEL = new ZoomLevel(
  [
    new TickSpec(DAY_SPACING, makeSStepper(DAY_SPACING), "%a %d"),
    new TickSpec(
      MINUTE_SPACING,
      makeSStepper(MINUTE_SPACING),
      "%H:%M",
      [1, 5, 15]
    ),
  ],
  "MMM 00"
);

export const HMS_ZOOM_LEVEL = new ZoomLevel(
  [
    new TickSpec(
      SECOND_SPACING,
      makeSStepper(SECOND_SPACING),
      "%H:%M:%S",
      [1, 5, 15, 30]
    ),
  ],
  "99:99:99"
);

export const MS_ZOOM_LEVEL = new ZoomLevel(
  [
    new TickSpec(MINUTE_SPACING, makeSStepper(MINUTE_SPACING), "%H:%M:%S"),
    new TickSpec(
      MS_SPACING,
      makeMSStepper(MS_SPACING),
      "%S.%f",
      [1, 5, 10, 25]
    ),
  ],
  "99:99:99"
);

//  export const zoomLevels = new Map([
//     (Infinity,      YEAR_MONTH_ZOOM_LEVEL),
//     (5 * 3600*24, MONTH_DAY_ZOOM_LEVEL),
//     (6 * 3600,    DAY_HOUR_ZOOM_LEVEL),
//     (15 * 60,     HOUR_MINUTE_ZOOM_LEVEL),
//     (30,          HMS_ZOOM_LEVEL),
//     (1,           MS_ZOOM_LEVEL),
//     ])
export const zoomLevels = new Map<number, ZoomLevel>();
zoomLevels.set(Infinity, YEAR_MONTH_ZOOM_LEVEL);
zoomLevels.set(5 * 3600 * 24, MONTH_DAY_ZOOM_LEVEL);
zoomLevels.set(6 * 3600, DAY_HOUR_ZOOM_LEVEL);
zoomLevels.set(15 * 60, HOUR_MINUTE_ZOOM_LEVEL);
zoomLevels.set(30, HMS_ZOOM_LEVEL);
zoomLevels.set(1, MS_ZOOM_LEVEL);
