import React from 'react';

interface TimelineData {
  date: Date;
  threats: number;
  issues: number;
  id: string;
}

interface AnalysisTimelineChartProps {
  data: TimelineData[];
}

export const AnalysisTimelineChart: React.FC<AnalysisTimelineChartProps> = ({ data }) => {
  const chartHeight = 250;
  const barWidth = 20;
  const barGap = 15;
  const chartWidth = data.length * (barWidth + barGap);
  const maxValue = Math.max(...data.map(d => d.threats + d.issues), 1);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <svg width={chartWidth} height={chartHeight} aria-label="Analysis timeline chart" role="img">
        <g>
          {data.map((d, i) => {
            const total = d.threats + d.issues;
            const barHeight = (total / maxValue) * (chartHeight - 40);
            const threatHeight = (d.threats / maxValue) * (chartHeight - 40);
            const x = i * (barWidth + barGap);
            const y = chartHeight - barHeight - 20;

            return (
              <g key={d.id} className="group">
                <title>
                  {`${d.date.toLocaleDateString()}: ${d.threats} threats, ${d.issues} issues`}
                </title>
                {/* Issues part of the bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#F97316" // Orange for issues
                  rx="3"
                  ry="3"
                  opacity="0.5"
                />
                {/* Threats part of the bar (overlay) */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={threatHeight}
                  fill="#EF4444" // Red for threats
                  rx="3"
                  ry="3"
                  opacity="0.8"
                />
                 <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill="white"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                  {total}
                 </text>
                 <text
                    x={x + barWidth / 2}
                    y={chartHeight}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#8B949E"
                    writingMode="vertical-rl"
                    // Fix: The `textOrientation` attribute is not part of React's SVG types. It's a CSS property and should be applied via the `style` prop.
                    style={{ textOrientation: 'mixed' }}
                >
                    {d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="flex justify-center items-center space-x-4 mt-4 text-sm">
        <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></div>
            <span>Security Threats</span>
        </div>
        <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
            <span>Operational Issues</span>
        </div>
      </div>
    </div>
  );
};
