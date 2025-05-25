"use client";

import {
  eachDayOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HealthRecord } from "~/types/health";
import { HEALTH_DATA_TYPES, METRIC_DISPLAY_NAMES } from "~/types/health";

interface HealthDataVisualizationProps {
  healthRecords: HealthRecord[];
  selectedMetrics: string[];
}

interface ChartData {
  date: string;
  [key: string]: string | number;
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
  "#ffb347",
  "#87ceeb",
  "#daa520",
  "#ff6347",
];

export function HealthDataVisualization({
  healthRecords,
  selectedMetrics,
}: HealthDataVisualizationProps) {
  const chartData = useMemo(() => {
    if (!healthRecords.length || !selectedMetrics.length) return [];

    // Filter records by selected metrics
    const filteredRecords = healthRecords.filter((record) =>
      selectedMetrics.includes(record.type),
    );

    if (!filteredRecords.length) return [];

    // Get date range
    const dates = filteredRecords.map((record) =>
      startOfDay(new Date(record.startDate)),
    );
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Create daily data points
    const dateRange = eachDayOfInterval({ start: minDate, end: maxDate });

    const dailyData: ChartData[] = dateRange.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dataPoint: ChartData = { date: dateStr };

      selectedMetrics.forEach((metric) => {
        const dayRecords = filteredRecords.filter((record) => {
          const recordDate = new Date(record.startDate);
          return (
            record.type === metric &&
            recordDate >= dayStart &&
            recordDate <= dayEnd
          );
        });

        if (dayRecords.length > 0) {
          // For step count and similar metrics, sum the values
          if (
            metric === HEALTH_DATA_TYPES.STEP_COUNT ||
            metric === HEALTH_DATA_TYPES.DISTANCE_WALKING_RUNNING ||
            metric === HEALTH_DATA_TYPES.ACTIVE_ENERGY_BURNED
          ) {
            dataPoint[metric] = dayRecords.reduce(
              (sum, record) => sum + parseFloat(record.value),
              0,
            );
          } else {
            // For other metrics, use the average
            const sum = dayRecords.reduce(
              (sum, record) => sum + parseFloat(record.value),
              0,
            );
            dataPoint[metric] = sum / dayRecords.length;
          }
        }
      });

      return dataPoint;
    });

    return dailyData.filter((data) =>
      selectedMetrics.some((metric) => data[metric] !== undefined),
    );
  }, [healthRecords, selectedMetrics]);

  const getMetricSummary = useMemo(() => {
    return selectedMetrics
      .map((metric) => {
        const records = healthRecords.filter(
          (record) => record.type === metric,
        );
        if (!records.length) return null;

        const values = records
          .map((record) => parseFloat(record.value))
          .filter((v) => !isNaN(v));
        const displayName = METRIC_DISPLAY_NAMES[metric]?.name || metric;
        const unit = records[0]?.unit || "";

        return {
          type: metric,
          displayName,
          unit,
          count: records.length,
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          latest: values[values.length - 1],
        };
      })
      .filter(Boolean);
  }, [healthRecords, selectedMetrics]);

  const pieData = useMemo(() => {
    const typeCounts = healthRecords.reduce(
      (acc, record) => {
        const displayName =
          METRIC_DISPLAY_NAMES[record.type]?.name || record.type;
        acc[displayName] = (acc[displayName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 data types
  }, [healthRecords]);

  if (!chartData.length && !pieData.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {getMetricSummary.map(
          (summary, index) =>
            summary && (
              <div
                key={summary.type}
                className="rounded-lg border bg-white p-6 shadow"
              >
                <h3 className="mb-2 font-semibold text-gray-900">
                  {summary.displayName}
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    Average:{" "}
                    <span className="font-medium">
                      {summary.average.toFixed(2)} {summary.unit}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Range:{" "}
                    <span className="font-medium">
                      {summary.min.toFixed(1)} - {summary.max.toFixed(1)}{" "}
                      {summary.unit}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Data Points:{" "}
                    <span className="font-medium">{summary.count}</span>
                  </p>
                </div>
              </div>
            ),
        )}
      </div>

      {/* Time Series Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Trends Over Time</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(parseISO(value), "MMM dd")}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) =>
                    format(parseISO(value as string), "PPP")
                  }
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)}`,
                    METRIC_DISPLAY_NAMES[name as string]?.name || name,
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    METRIC_DISPLAY_NAMES[value]?.name || value
                  }
                />
                {selectedMetrics.map((metric, index) => (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Type Distribution */}
      {pieData.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Data Type Distribution</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
