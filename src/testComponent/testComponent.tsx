import React from 'react';
import Background from '../components/background';

import { lineData } from '../data/time';
import { ChartContext } from '../components/hooks/chartContext';
import PlotLine from '../components/plotLine';

const TestComponent: React.FC = () => {
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

export default TestComponent;
