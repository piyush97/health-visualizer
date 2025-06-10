"use client";

import {
  eachDayOfInterval,
  endOfDay,
  endOfWeek,
  format,
  getDay,
  getWeek,
  parseISO,
  startOfDay,
  startOfWeek
} from "date-fns";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { HEALTH_DATA_TYPES, METRIC_DISPLAY_NAMES } from "~/types/health";

interface HealthRecord {
  type: string;
  value: string;
  unit?: string;
  startDate: string;
  endDate: string;
}

interface HealthDataVisualizationProps {
  healthRecords: HealthRecord[]; // Health records passed from dashboard
  selectedMetrics: string[]; // Selected metric types to visualize
}

interface ChartData {
  date: string;
  week?: string;
  month?: string;
  [key: string]: string | number | undefined;
}

interface InsightData {
  metric: string;
  insight: string;
  severity: 'info' | 'warning' | 'success';
  change?: number; // Percentage change
}

type TimeFrame = 'daily' | 'weekly' | 'monthly';

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
] as const;

export function HealthDataVisualization({
  healthRecords,
  selectedMetrics,
}: HealthDataVisualizationProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showSleepAnalysis, setShowSleepAnalysis] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  // Generate time series data with different aggregation periods
  const chartData = useMemo(() => {
    if (!healthRecords?.length || !selectedMetrics?.length) return [];

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
      const weekStr = format(date, "yyyy-'W'ww"); // Year-Week format
      const monthStr = format(date, "yyyy-MM"); // Year-Month format
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dataPoint: ChartData = { 
        date: dateStr,
        week: weekStr,
        month: monthStr
      };

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
            metric === HEALTH_DATA_TYPES.ACTIVE_ENERGY_BURNED ||
            metric === HEALTH_DATA_TYPES.FLIGHTS_CLIMBED ||
            metric === HEALTH_DATA_TYPES.STAND_HOURS ||
            metric === HEALTH_DATA_TYPES.EXERCISE_TIME
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

  // Aggregate data by weekly or monthly periods
  const aggregatedData = useMemo(() => {
    if (!chartData.length) return { weekly: [], monthly: [] };

    // Group by week
    const weeklyData = chartData.reduce((acc, dataPoint) => {
      const weekKey = dataPoint.week!;
      acc[weekKey] ??= {
          date: weekKey,
          counts: {} as Record<string, number>,
          sums: {} as Record<string, number>,
        };

      selectedMetrics.forEach(metric => {
        if (dataPoint[metric] !== undefined) {
          acc[weekKey]!.sums[metric] = (acc[weekKey]!.sums[metric] ?? 0) + (dataPoint[metric] as number);
          acc[weekKey]!.counts[metric] = (acc[weekKey]!.counts[metric] ?? 0) + 1;
        }
      });

      return acc;
    }, {} as Record<string, { date: string; counts: Record<string, number>; sums: Record<string, number> }>);

    // Group by month
    const monthlyData = chartData.reduce((acc, dataPoint) => {
      const monthKey = dataPoint.month!;
      acc[monthKey] ??= {
          date: monthKey,
          counts: {} as Record<string, number>,
          sums: {} as Record<string, number>,
        };

      selectedMetrics.forEach(metric => {
        if (dataPoint[metric] !== undefined) {
          acc[monthKey]!.sums[metric] = (acc[monthKey]!.sums[metric] ?? 0) + (dataPoint[metric] as number);
          acc[monthKey]!.counts[metric] = (acc[monthKey]!.counts[metric] ?? 0) + 1;
        }
      });

      return acc;
    }, {} as Record<string, { date: string; counts: Record<string, number>; sums: Record<string, number> }>);

    // Convert to arrays and calculate averages
    const weeklyResult = Object.values(weeklyData).map(week => {
      const result: ChartData = { date: week.date };
      
      selectedMetrics.forEach(metric => {
        if (week.counts[metric]) {
          // For step count and similar metrics, use sum
          if (
            metric === HEALTH_DATA_TYPES.STEP_COUNT ||
            metric === HEALTH_DATA_TYPES.DISTANCE_WALKING_RUNNING ||
            metric === HEALTH_DATA_TYPES.ACTIVE_ENERGY_BURNED ||
            metric === HEALTH_DATA_TYPES.FLIGHTS_CLIMBED
          ) {
            result[metric] = week.sums[metric];
          } else {
            // For other metrics like heart rate, use average
            result[metric] = week.sums[metric]! / week.counts[metric];
          }
        }
      });
      
      return result;
    }).sort((a, b) => a.date.localeCompare(b.date));

    const monthlyResult = Object.values(monthlyData).map(month => {
      const result: ChartData = { date: month.date };
      
      selectedMetrics.forEach(metric => {
        if (month.counts[metric]) {
          // For step count and similar metrics, use sum
          if (
            metric === HEALTH_DATA_TYPES.STEP_COUNT ||
            metric === HEALTH_DATA_TYPES.DISTANCE_WALKING_RUNNING ||
            metric === HEALTH_DATA_TYPES.ACTIVE_ENERGY_BURNED ||
            metric === HEALTH_DATA_TYPES.FLIGHTS_CLIMBED
          ) {
            result[metric] = month.sums[metric];
          } else {
            // For other metrics like heart rate, use average
            result[metric] = month.sums[metric]! / month.counts[metric];
          }
        }
      });
      
      return result;
    }).sort((a, b) => a.date.localeCompare(b.date));

    return {
      weekly: weeklyResult,
      monthly: monthlyResult
    };
  }, [chartData, selectedMetrics]);

  // Calculate summary statistics for each metric
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
        const displayName = METRIC_DISPLAY_NAMES[metric]?.name ?? metric;
        const unit = records[0]?.unit ?? "";

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

  // Calculate correlation data between metrics
  const correlationData = useMemo(() => {
    if (selectedMetrics.length < 2) return [];

    // Get all possible pairs of metrics
    const metricPairs: [string, string][] = [];
    for (let i = 0; i < selectedMetrics.length; i++) {
      for (let j = i + 1; j < selectedMetrics.length; j++) {
        if (selectedMetrics[i] && selectedMetrics[j]) {
          metricPairs.push([selectedMetrics[i]!, selectedMetrics[j]!]);
        }
      }
    }

    return metricPairs.map(([metricX, metricY]) => {
      // Find data points where both metrics have values
      const points = chartData
        .filter(dataPoint => 
          dataPoint[metricX] !== undefined && 
          dataPoint[metricY] !== undefined
        )
        .map(dataPoint => ({
          x: dataPoint[metricX] as number,
          y: dataPoint[metricY] as number,
          date: dataPoint.date
        }));

      return {
        xMetric: metricX,
        yMetric: metricY,
        xName: METRIC_DISPLAY_NAMES[metricX]?.name ?? metricX,
        yName: METRIC_DISPLAY_NAMES[metricY]?.name ?? metricY,
        points
      };
    }).filter(data => data.points.length > 0);
  }, [chartData, selectedMetrics]);

  // Calculate distribution of data types
  const pieData = useMemo(() => {
    if (!healthRecords?.length) return [];
    
    const typeCounts = healthRecords.reduce(
      (acc, record) => {
        const displayName =
          METRIC_DISPLAY_NAMES[record.type]?.name ?? record.type;
        acc[displayName] = (acc[displayName] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 data types
  }, [healthRecords]);

  // Process sleep analysis data
  const sleepData = useMemo(() => {
    if (!healthRecords.length) return [];
    
    const sleepRecords = healthRecords.filter(
      record => record.type === HEALTH_DATA_TYPES.SLEEP_ANALYSIS
    );
    
    if (!sleepRecords.length) return [];      // Group sleep records by day
    const sleepByDay = sleepRecords.reduce((acc, record) => {
      const date = format(new Date(record.startDate), 'yyyy-MM-dd');
      
      acc[date] ??= {
        inBed: [] as { start: Date; end: Date }[],
        asleep: [] as { start: Date; end: Date }[],
      };
      
      // Value: 0 = InBed, 1 = Asleep, 2 = Awake
      if (record.value === '0') {
        acc[date].inBed.push({
          start: new Date(record.startDate),
          end: new Date(record.endDate),
        });
      } else if (record.value === '1') {
        acc[date].asleep.push({
          start: new Date(record.startDate),
          end: new Date(record.endDate),
        });
      }
      
      return acc;
    }, {} as Record<string, { inBed: { start: Date; end: Date }[]; asleep: { start: Date; end: Date }[] }>);
    
    // Calculate sleep duration and quality for each day
    return Object.entries(sleepByDay).map(([date, data]) => {
      // Calculate total sleep duration in hours
      const totalSleepMs = data.asleep.reduce(
        (total, period) => total + (period.end.getTime() - period.start.getTime()),
        0
      );
      const sleepDuration = totalSleepMs / (1000 * 60 * 60); // Convert to hours
      
      // Find earliest and latest times
      const allTimes = [...data.inBed, ...data.asleep].flatMap(period => [period.start, period.end]);
      const earliestTime = new Date(Math.min(...allTimes.map(t => t.getTime())));
      const latestTime = new Date(Math.max(...allTimes.map(t => t.getTime())));
      
      // Get the last asleep record safely
      const lastAsleepIndex = data.asleep.length - 1;
      const lastAsleep = lastAsleepIndex >= 0 ? data.asleep[lastAsleepIndex] : null;
      
      const asleepStart = data.asleep.length > 0 && data.asleep[0] ? format(data.asleep[0].start, 'HH:mm') : '';
      const asleepEnd = lastAsleep ? format(lastAsleep.end, 'HH:mm') : '';
      
      return {
        date,
        duration: sleepDuration,
        inBedStart: format(earliestTime, 'HH:mm'),
        inBedEnd: format(latestTime, 'HH:mm'),
        asleepStart,
        asleepEnd,
        // Simple sleep quality metric (proportion of in-bed time spent asleep)
        quality: data.inBed.length 
          ? Math.min(100, Math.round((sleepDuration / 
              (data.inBed.reduce((total, period) => 
                total + (period.end.getTime() - period.start.getTime()), 0) / (1000 * 60 * 60))) * 100))
          : undefined
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [healthRecords]);

  // Generate calendar heatmap data
  const calendarData = useMemo(() => {
    if (!chartData.length || !selectedMetrics.length) return [];
    
    // Use the first selected metric for the heatmap
    const metric = selectedMetrics[0];
    if (!metric) return [];
    
    return chartData.map(dataPoint => {
      const date = parseISO(dataPoint.date);
      return {
        date: dataPoint.date,
        value: dataPoint[metric] as number || 0,
        day: getDay(date), // 0-6 (Sunday-Saturday)
        week: getWeek(date),
      };
    });
  }, [chartData, selectedMetrics]);

  // Generate weekly summaries
  const weeklySummaries = useMemo(() => {
    if (!aggregatedData.weekly.length || !selectedMetrics.length) return [];
    
    return aggregatedData.weekly.map((week, index, weeks) => {
      const prevWeek = index > 0 ? weeks[index - 1] : null;
      
      const metrics: Record<string, {
        average: number;
        total: number;
        daysWithData: number;
        trend: 'up' | 'down' | 'stable';
        percentChange: number;
      }> = {};
      
      selectedMetrics.forEach(metric => {
        if (week[metric] !== undefined) {
          const currentValue = week[metric] as number;
          const previousValue = prevWeek?.[metric] as number | undefined;
          
          let trend: 'up' | 'down' | 'stable' = 'stable';
          let percentChange = 0;
          
          if (previousValue !== undefined && previousValue !== 0) {
            percentChange = ((currentValue - previousValue) / previousValue) * 100;
            trend = percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable';
          }
          
          metrics[metric] = {
            average: currentValue,
            total: currentValue, // For weekly data, this is already aggregated
            daysWithData: 7, // Assumption for weekly data
            trend,
            percentChange,
          };
        }
      });
      
      // Parse week string format "2023-W01" to get start/end dates
      const weekParts = week.date.split('-W');
      if (weekParts.length !== 2) {
        return {
          week: week.date,
          startDate: '',
          endDate: '',
          metrics,
        };
      }
      
      const yearStr = weekParts[0];
      const weekStr = weekParts[1];
      
      if (!yearStr || !weekStr) {
        return {
          week: week.date,
          startDate: '',
          endDate: '',
          metrics,
        };
      }
      
      const year = parseInt(yearStr);
      const weekNum = parseInt(weekStr);
      
      // Calculate start and end dates of the week
      const startDate = startOfWeek(new Date(year, 0, 1 + (weekNum - 1) * 7));
      const endDate = endOfWeek(startDate);
      
      return {
        week: week.date,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        metrics,
      };
    });
  }, [aggregatedData.weekly, selectedMetrics]);

  // Generate health insights
  const healthInsights = useMemo(() => {
    if (!selectedMetrics.length || !weeklySummaries.length) return [];
    
    const insights: InsightData[] = [];
    
    selectedMetrics.forEach(metric => {
      if (!weeklySummaries.length) return;
      
      const latestWeek = weeklySummaries[weeklySummaries.length - 1];
      if (!latestWeek?.metrics) return;
      
      const metricData = latestWeek.metrics[metric];
      
      if (!metricData) return;
      
      const displayName = METRIC_DISPLAY_NAMES[metric]?.name ?? metric;
      
      // Generate insights based on trends
      if (metricData.trend === 'up' && metricData.percentChange > 20) {
        insights.push({
          metric,
          insight: `Your ${displayName.toLowerCase()} has increased significantly by ${Math.abs(metricData.percentChange).toFixed(1)}% compared to last week.`,
          severity: metric === HEALTH_DATA_TYPES.STEP_COUNT || 
                   metric === HEALTH_DATA_TYPES.EXERCISE_TIME ? 'success' : 'info',
          change: metricData.percentChange,
        });
      } else if (metricData.trend === 'down' && metricData.percentChange < -20) {
        insights.push({
          metric,
          insight: `Your ${displayName.toLowerCase()} has decreased by ${Math.abs(metricData.percentChange).toFixed(1)}% compared to last week.`,
          severity: metric === HEALTH_DATA_TYPES.STEP_COUNT || 
                   metric === HEALTH_DATA_TYPES.EXERCISE_TIME ? 'warning' : 'info',
          change: metricData.percentChange,
        });
      }
      
      // Metric-specific insights
      if (metric === HEALTH_DATA_TYPES.STEP_COUNT) {
        const avgSteps = metricData.average;
        if (avgSteps < 5000) {
          insights.push({
            metric,
            insight: `Your average daily step count is ${Math.round(avgSteps)}, which is below the recommended 10,000 steps.`,
            severity: 'warning',
          });
        } else if (avgSteps >= 10000) {
          insights.push({
            metric,
            insight: `Great job! Your average daily step count is ${Math.round(avgSteps)}, meeting or exceeding the recommended 10,000 steps.`,
            severity: 'success',
          });
        }
      } else if (metric === HEALTH_DATA_TYPES.HEART_RATE) {
        const avgHeartRate = metricData.average;
        if (avgHeartRate > 100) {
          insights.push({
            metric,
            insight: `Your average resting heart rate is ${Math.round(avgHeartRate)} bpm, which is higher than the typical resting range.`,
            severity: 'warning',
          });
        } else if (avgHeartRate < 60) {
          insights.push({
            metric,
            insight: `Your average resting heart rate is ${Math.round(avgHeartRate)} bpm, which is in the athletic range.`,
            severity: 'success',
          });
        }
      } else if (metric === HEALTH_DATA_TYPES.SLEEP_ANALYSIS) {
        const avgSleepHours = metricData.average;
        if (avgSleepHours < 7) {
          insights.push({
            metric,
            insight: `You're averaging ${avgSleepHours.toFixed(1)} hours of sleep, which is below the recommended 7-9 hours.`,
            severity: 'warning',
          });
        } else if (avgSleepHours >= 7 && avgSleepHours <= 9) {
          insights.push({
            metric,
            insight: `You're getting ${avgSleepHours.toFixed(1)} hours of sleep on average, which is within the healthy range.`,
            severity: 'success',
          });
        }
      }
    });
    
    return insights.slice(0, 5); // Limit to top 5 insights
  }, [selectedMetrics, weeklySummaries]);

  if (!healthRecords?.length && !pieData.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toggle controls for different visualizations */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5">
        <button
          onClick={() => setShowInsights(!showInsights)}
          className={`rounded px-2 py-1 text-xs font-medium ${
            showInsights ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showInsights ? 'Hide Insights' : 'Show Insights'}
        </button>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`rounded px-2 py-1 text-xs font-medium ${
            showHeatmap ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showHeatmap ? 'Hide Activity Heatmap' : 'Show Activity Heatmap'}
        </button>
        <button
          onClick={() => setShowWeeklySummary(!showWeeklySummary)}
          className={`rounded px-2 py-1 text-xs font-medium ${
            showWeeklySummary ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showWeeklySummary ? 'Hide Weekly Summary' : 'Show Weekly Summary'}
        </button>
        <button
          onClick={() => setShowSleepAnalysis(!showSleepAnalysis)}
          className={`rounded px-2 py-1 text-xs font-medium ${
            showSleepAnalysis ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          disabled={!sleepData.length}
        >
          {showSleepAnalysis ? 'Hide Sleep Analysis' : 'Show Sleep Analysis'}
        </button>
        <button
          onClick={() => {
            setShowInsights(true);
            setShowHeatmap(true);
            setShowWeeklySummary(true);
            setShowSleepAnalysis(true);
          }}
          className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
        >
          Show All Visualizations
        </button>
      </div>

      {/* Health Insights Panel */}
      {showInsights && healthInsights.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Health Insights</h3>
          <div className="space-y-3">
            {healthInsights.map((insight, index) => (
              <div 
                key={index} 
                className={`rounded-lg border p-3 ${
                  insight.severity === 'warning' 
                    ? 'border-yellow-200 bg-yellow-50' 
                    : insight.severity === 'success' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start">
                  <div className={`mr-2 mt-0.5 rounded-full p-1 ${
                    insight.severity === 'warning' 
                      ? 'bg-yellow-100 text-yellow-500' 
                      : insight.severity === 'success' 
                        ? 'bg-green-100 text-green-500' 
                        : 'bg-blue-100 text-blue-500'
                  }`}>
                    {insight.severity === 'warning' 
                      ? '⚠️' 
                      : insight.severity === 'success' 
                        ? '✅' 
                        : 'ℹ️'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">{insight.insight}</p>
                    {insight.change !== undefined && (
                      <span className={`text-xs font-medium ${
                        insight.change > 0 
                          ? 'text-green-600' 
                          : insight.change < 0 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                      }`}>
                        {insight.change > 0 ? '+' : ''}{insight.change.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {getMetricSummary.map(
          (summary) =>
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

      {/* Weekly Summary */}
      {showWeeklySummary && weeklySummaries.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Weekly Progress</h3>
          <div className="space-y-6">
            {weeklySummaries.slice(-4).reverse().map((weekData) => (
              <div key={weekData.week} className="border-b border-gray-100 pb-4">
                <h4 className="mb-2 text-sm font-medium text-gray-700">
                  Week of {format(parseISO(weekData.startDate), 'MMM d')} - {format(parseISO(weekData.endDate), 'MMM d, yyyy')}
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(weekData.metrics).map(([metric, data]) => {
                    const displayName = METRIC_DISPLAY_NAMES[metric]?.name ?? metric;
                    return (
                      <div key={metric} className="rounded border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">{displayName}</span>
                          <span className={`text-xs font-medium ${
                            data.trend === 'up' 
                              ? 'text-green-600'
                              : data.trend === 'down' 
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}>
                            {data.trend === 'up' 
                              ? '↑' 
                              : data.trend === 'down' 
                                ? '↓' 
                                : '→'} 
                            {data.percentChange !== 0 ? `${Math.abs(data.percentChange).toFixed(1)}%` : ''}
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-gray-800">
                          {data.average.toFixed(0)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sleep Analysis */}
      {showSleepAnalysis && sleepData.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Sleep Analysis</h3>
          <div className="space-y-4">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sleepData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value: string) => format(parseISO(value), "MM/dd")}
                  />
                  <YAxis yAxisId="left" orientation="left" unit="hrs" domain={[0, 12]} />
                  <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'duration') return [`${Number(value).toFixed(1)} hrs`, 'Sleep Duration'];
                      if (name === 'quality') return [`${Number(value).toFixed(0)}%`, 'Sleep Quality'];
                      return [value, name];
                    }}
                    labelFormatter={(value) => format(parseISO(value as string), "EEEE, MMM d, yyyy")}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left" 
                    dataKey="duration" 
                    fill="#8884d8" 
                    name="Sleep Duration" 
                    barSize={20}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="quality" 
                    stroke="#82ca9d" 
                    name="Sleep Quality" 
                    dot={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bedtime
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wake Time
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sleepData.slice(-7).reverse().map(sleep => (
                    <tr key={sleep.date}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {format(parseISO(sleep.date), "EEE, MMM d")}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {sleep.inBedStart}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {sleep.inBedEnd}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {sleep.duration.toFixed(1)} hrs
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {sleep.quality !== undefined ? `${sleep.quality}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Activity Heatmap Calendar */}
      {showHeatmap && calendarData.length > 0 && selectedMetrics.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Activity Calendar</h3>
            <div className="text-sm text-gray-500">
              Showing {METRIC_DISPLAY_NAMES[selectedMetrics[0] ?? '']?.name ?? selectedMetrics[0] ?? 'Activity'}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
            {calendarData.slice(-56).map((day, index) => {
              // Calculate color intensity based on value
              const metric = selectedMetrics[0];
              const maxValue = Math.max(...calendarData.map(d => d.value));
              const intensity = day.value / maxValue;
              const bgColor = metric === HEALTH_DATA_TYPES.STEP_COUNT || 
                              metric === HEALTH_DATA_TYPES.EXERCISE_TIME
                ? `rgba(52, 211, 153, ${Math.min(1, intensity * 1.2)})`  // Green for activity
                : metric === HEALTH_DATA_TYPES.HEART_RATE
                ? `rgba(239, 68, 68, ${Math.min(1, intensity * 1.2)})` // Red for heart rate
                : `rgba(79, 70, 229, ${Math.min(1, intensity * 1.2)})`; // Indigo default
              
              return (
                <div 
                  key={index}
                  className="aspect-square rounded p-1"
                  style={{ 
                    backgroundColor: bgColor,
                    gridColumnStart: index === 0 ? day.day + 1 : 'auto' // Position first day correctly
                  }}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center">
                    <span className="text-[10px] font-medium text-gray-700">
                      {format(parseISO(day.date), 'd')}
                    </span>
                    {day.value > 0 && (
                      <span className="text-[8px] text-gray-900">
                        {day.value > 999 ? `${(day.value / 1000).toFixed(1)}k` : Math.round(day.value)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Frame Selector */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Trends Over Time</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeFrame('daily')}
              className={`rounded px-3 py-1 text-sm ${
                timeFrame === 'daily'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeFrame('weekly')}
              className={`rounded px-3 py-1 text-sm ${
                timeFrame === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeFrame('monthly')}
              className={`rounded px-3 py-1 text-sm ${
                timeFrame === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={
              timeFrame === 'weekly' 
                ? aggregatedData.weekly 
                : timeFrame === 'monthly' 
                  ? aggregatedData.monthly 
                  : chartData
            }>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => {
                  if (timeFrame === 'weekly') {
                    // Format: "2023-W01" -> "Week 1"
                    const parts = value.split('-W');
                    return parts.length > 1 ? `Week ${parts[1]}` : value;
                  } else if (timeFrame === 'monthly') {
                    // Format: "2023-01" -> "Jan"
                    return format(parseISO(`${value}-01`), "MMM yyyy");
                  } else {
                    // Daily format
                    return format(parseISO(value), "MMM dd");
                  }
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => {
                  if (timeFrame === 'weekly') {
                    const [year, week] = (value as string).split('-W');
                    return `Week ${week}, ${year}`;
                  } else if (timeFrame === 'monthly') {
                    return format(parseISO(`${value}-01`), "MMMM yyyy");
                  } else {
                    return format(parseISO(value as string), "PPP");
                  }
                }}
                formatter={(value, name) => [
                  `${Number(value).toFixed(2)}`,
                  METRIC_DISPLAY_NAMES[name as string]?.name ?? name,
                ]}
              />
              <Legend
                formatter={(value: string) =>
                  METRIC_DISPLAY_NAMES[value]?.name ?? value
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

      {/* Daily Activity Comparison (Bar Chart) */}
      {selectedMetrics.length > 0 && chartData.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Daily Activity Comparison</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.slice(-14)} // Show last 14 days
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value: string) => format(parseISO(value), "MM/dd")}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value: string) => format(parseISO(value), "PPP")}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(2)}`,
                    METRIC_DISPLAY_NAMES[name as string]?.name ?? name,
                  ]}
                />
                <Legend />
                {selectedMetrics.slice(0, 3).map((metric, index) => (
                  <Bar 
                    key={metric} 
                    dataKey={metric} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Correlation Analysis */}
      {(() => {
        if (correlationData.length === 0) return null;
        const firstCorrelation = correlationData[0];
        if (!firstCorrelation?.points || firstCorrelation.points.length <= 5) return null;
        
        return (
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">Metric Correlations</h3>
            <p className="text-sm text-gray-500 mb-4">
              Showing relationship between {firstCorrelation.xName} and {firstCorrelation.yName}
            </p>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={firstCorrelation.xName ?? 'X Metric'} 
                    unit={getMetricSummary.find(s => s?.type === firstCorrelation.xMetric)?.unit ?? ''}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name={firstCorrelation.yName ?? 'Y Metric'}
                    unit={getMetricSummary.find(s => s?.type === firstCorrelation.yMetric)?.unit ?? ''}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [value, name === 'x' ? firstCorrelation.xName : firstCorrelation.yName]}
                  />
                  <Scatter 
                    name="Values" 
                    data={firstCorrelation.points} 
                    fill={COLORS[0]} 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

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

      {/* Radar Chart for Multiple Metrics Comparison */}
      {selectedMetrics.length >= 3 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">Metrics Comparison</h3>
          <p className="text-sm text-gray-500 mb-4">
            Compare your latest values against typical ranges
          </p>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius={150} width={500} height={500} data={
                selectedMetrics.map(metric => {
                  const summary = getMetricSummary.find(s => s?.type === metric);
                  if (!summary) return null;
                  
                  // Calculate a normalized score (0-100) for this metric
                  // based on where the latest value falls in the range
                  let normalizedValue = 0;
                  
                  // Different normalization based on metric type
                  if (
                    metric === HEALTH_DATA_TYPES.STEP_COUNT ||
                    metric === HEALTH_DATA_TYPES.EXERCISE_TIME ||
                    metric === HEALTH_DATA_TYPES.DISTANCE_WALKING_RUNNING
                  ) {
                    // For activity metrics, higher is better
                    // 10k steps or 30 min exercise would be 100%
                    const target = metric === HEALTH_DATA_TYPES.STEP_COUNT 
                      ? 10000 
                      : metric === HEALTH_DATA_TYPES.EXERCISE_TIME 
                        ? 30 
                        : 5; // 5km
                    normalizedValue = Math.min(100, (summary.average / target) * 100);
                  } 
                  else if (
                    metric === HEALTH_DATA_TYPES.HEART_RATE ||
                    metric === HEALTH_DATA_TYPES.RESTING_HEART_RATE
                  ) {
                    // For heart rate, closer to optimal is better (60-80 bpm)
                    const optimal = 70;
                    const distance = Math.abs(summary.average - optimal);
                    normalizedValue = Math.max(0, 100 - (distance / 30) * 100);
                  }
                  else {
                    // Default normalization (where min-max is the full range)
                    if (summary.max !== summary.min) {
                      normalizedValue = summary.latest !== undefined 
                        ? ((summary.latest - summary.min) / (summary.max - summary.min)) * 100
                        : 50;
                    } else {
                      normalizedValue = 50; // Default to middle if no range
                    }
                  }
                  
                  return {
                    metric: METRIC_DISPLAY_NAMES[metric]?.name ?? metric,
                    value: normalizedValue,
                    fullMark: 100,
                  };
                }).filter(Boolean) as Array<{metric: string; value: number; fullMark: number}>
              }>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar 
                  name="Your Metrics" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6} 
                />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
