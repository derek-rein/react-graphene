import { addMinutes } from "date-fns";

export const lineData: LineData[] = [];

let start = new Date();

Array(500)
	.fill("")
	.map((z, i) => {
		start = addMinutes(start, Math.random() * 10000);
		const new_row: LineData = {
			time: start.getTime() / 1000,
			value: Math.random() * 100,
		};
		lineData.push(new_row);
	});
