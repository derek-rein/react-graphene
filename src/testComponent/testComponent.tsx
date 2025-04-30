import type React from "react";
import Background from "../components/background";

import { PlotLine } from "../components/plotLine";
import { ChartContext } from "../context/chartContext";
import { lineData } from "../data/time";

interface TestComponentProps {
	gridLineColor?: string;
	gridLineWidth?: number;
}

export const TestComponent: React.FC<TestComponentProps> = ({
	gridLineColor,
	gridLineWidth,
}) => {
	return (
		<>
			<ChartContext>
				<Background
					gridLineColor={gridLineColor}
					gridLineWidth={gridLineWidth}
				/>
				<PlotLine data={lineData} />
				{/* <CrossHairs/> */}
			</ChartContext>
		</>
	);
};
