import React from 'react';
import Background from '../components/background';

import { lineData } from '../data/time';
import { ChartContext } from '../context/chartContext';
import PlotLine from '../components/plotLine';

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

