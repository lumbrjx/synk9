import { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

type SensorData = {
  key: string;
  s_type: string;
  sensor_id: string;
  time: string; // ISO string or timestamp
  value: number;
};

type DataPoint = {
  x: number; // timestamp in ms
  [key: string]: number; // dynamic keys for each sensor
};

const MAX_POINTS = 50;

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff7f",
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57",
  "#ff9ff3", "#54a0ff", "#5f27cd", "#00d2d3", "#ff9f43",
  "#1dd1a1", "#feca57", "#48dbfb", "#ff6b6b", "#1e90ff"
];

export default function RealTimeChart(
  { socket, isPaused }:
    { socket: any, isPaused: boolean }
) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [sensorKeys, setSensorKeys] = useState<Set<string>>(new Set());


  // Calculate domain for X-axis
  const xAxisDomain = useMemo(() => {
    return data.length > 0 ? ["dataMin", "dataMax"] : [0, 1];
  }, [data]);
  const keyColorMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    Array.from(sensorKeys).forEach((key, index) => {
      map[key] = COLORS[index % COLORS.length];
    });
    return map;
  }, [sensorKeys]);

  useEffect(() => {
    const handler = (payload: SensorData) => {
      // Only update data if not paused
      if (isPaused) return;

      console.log("payload", payload);
      const timestamp = new Date(payload.time).getTime() || Date.now();

      setData((prev) => {
        // Find if we already have a data point for this timestamp
        const existingPointIndex = prev.findIndex(point =>
          Math.abs(point.x - timestamp) < 1000 // within 1 second
        );

        let updated: DataPoint[];

        if (existingPointIndex >= 0) {
          // Update existing point with new sensor value
          updated = [...prev];
          updated[existingPointIndex] = {
            ...updated[existingPointIndex],
            [payload.key]: payload.value
          };
        } else {
          // Create new data point
          const newPoint: DataPoint = {
            x: timestamp,
            [payload.key]: payload.value
          };
          updated = [...prev, newPoint];
        }

        // Keep only the most recent points
        return updated.length > MAX_POINTS
          ? updated.slice(-MAX_POINTS)
          : updated;
      });

      // Track unique sensor keys
      setSensorKeys(prev => new Set([...prev, payload.key]));
    };

    socket.on("data", handler);

    return () => {
      socket.off("data", handler);
    };
  }, [socket, isPaused]);

  // Custom tooltip to show all sensor values at a timestamp
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-gray-700">
            {`Time: ${new Date(label).toLocaleTimeString()}`}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value?.toFixed(2) || 'N/A'}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96 p-4">
      {/* Control Panel */}

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="x"
            type="number"
            scale="time"
            domain={xAxisDomain}
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
            stroke="#666"
          />
          <YAxis
            stroke="#666"
            tickFormatter={(value) => value.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Render a line for each unique sensor key */}
          {Array.from(sensorKeys).map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={keyColorMap[key]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              name={key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      {sensorKeys.size > 0 && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {Array.from(sensorKeys).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-4 h-0.5 rounded"
                style={{ backgroundColor: keyColorMap[key] }}
              />
              <span className="text-sm text-gray-700">{key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
