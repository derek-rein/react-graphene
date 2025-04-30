import type React from "react";
import Background from "../components/background";

import PlotLine from "../components/plotLine";
import { ChartContext } from "../context/chartContext";
import { lineData } from "../data/time";

export const TestComponent: React.FC = () => {
	return (
		<>
			<ChartContext>
				<Background />
				<PlotLine data={lineData} />
				{/* <CrossHairs/> */}
			</ChartContext>
		</>
	);
};
