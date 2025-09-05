import React from 'react';

export interface BarChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartData[];
  colors: { [key: string]: string };
}

export const BarChart: React.FC<BarChartProps> = ({ data, colors }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const barGap = 10;
  const barWidth = 40;
  const chartHeight = 250;
  const chartWidth = (barWidth + barGap) * data.length - barGap;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={chartWidth} height={chartHeight} aria-label="Bar chart" role="img">
        <g>
          {data.map((d, i) => {
            const barHeight = maxValue > 0 ? (d.value / maxValue) * (chartHeight - 40) : 0;
            const x = i * (barWidth + barGap);
            const y = chartHeight - barHeight - 20;
            return (
              <g key={d.label} className="group">
                <title>{`${d.label}: ${d.value}`}</title>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={colors[d.label] || '#8884d8'}
                  rx="4"
                  ry="4"
                  className="transition-opacity duration-200"
                  opacity="0.8"
                  aria-label={`${d.label} with value ${d.value}`}
                />
                 <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill="white"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  {d.value}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#8B949E"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
