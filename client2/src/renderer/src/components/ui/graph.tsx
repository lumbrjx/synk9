import { useAxiosQuery } from "@/hooks/get";
import { query } from "@/queries/agent";
import { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Calendar, Clock, Play, Pause, RotateCcw } from "lucide-react";

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

export default function RealTimeChart({
  socket,
  isPaused: initialPaused = false,
  filterBy
}: {
  socket: any;
  isPaused?: boolean;
  filterBy?: any
}) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [sensorKeys, setSensorKeys] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(initialPaused);

  // Timestamp picker state
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Initialize with current date/time
  useEffect(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    setStartDate(yesterday.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    setStartTime(yesterday.toTimeString().slice(0, 5));
    setEndTime(now.toTimeString().slice(0, 5));
  }, []);

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

  // Create combined timestamp for API calls and calculate minutes difference
  const getTimestampRange = () => {
    const start = new Date(`${startDate}T${startTime}`).getTime();
    const end = new Date(`${endDate}T${endTime}`).getTime();
    const minutes = Math.ceil((end - start) / (1000 * 60)); // Convert to minutes
    return { start, end, minutes };
  };

  const {
    isError,
    error,
    isFetching,
    refetch
  } = useAxiosQuery({
    queryKey: ['logs', startDate, endDate, startTime, endTime],
    queryFn: async () => {
      try {
        console.log("Fetching logs...");
        let endpoint = '/logs/30'; // Default: last 30 minutes

        if (isHistoricalMode) {
          const { minutes } = getTimestampRange();
          // Use the minutes difference as the parameter
          endpoint = `/logs/${Math.max(1, minutes)}`;
        }

        const response = await query(endpoint);
        console.log("Fetch response:", response);
        return { response };
      } catch (e) {
        console.error("Fetch error:", e);
        throw e;
      }
    },
    options: {
      experimental_prefetchInRender: true,
      refetchOnWindowFocus: false,
      retry: 2,
      enabled: !isPaused || isHistoricalMode
    }
  });

  useEffect(() => {
    if (isPaused && !isHistoricalMode) return;

    const timeoutId = setTimeout(async () => {
      const d = await refetch();
      const x = await d.promise;

      if (isHistoricalMode) {
        const historicalData: DataPoint[] = [];
        const keys = new Set<string>();

        let logsData = x.response;

        if (logsData) {
          logsData.forEach((item: any) => {
            item.logs.forEach((item: SensorData) => {
              const timestamp = new Date(item.time).getTime();
              const existingPoint = historicalData.find(p => Math.abs(p.x - timestamp) < 1000);

              if (existingPoint) {
                existingPoint[item.key] = item.value;
              } else {
                historicalData.push({
                  x: timestamp,
                  [item.key]: item.value
                });
              }
              keys.add(item.key);

            })

          });
        }

        setData(historicalData.sort((a, b) => a.x - b.x));
        setSensorKeys(keys);
      } else {
        // For real-time mode, also handle the nested structure
        let logsData = x.response;
        if (Array.isArray(x.response) && x.response.length > 0 && x.response[0].logs) {
          logsData = x.response[0].logs;
        }
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isPaused, isHistoricalMode, refetch]);

  useEffect(() => {
    if (isHistoricalMode) return;

    const handler = (payload: SensorData) => {
      if (isPaused) return;

      const timestamp = new Date(payload.time).getTime() || Date.now();

      setData((prev) => {
        const existingPointIndex = prev.findIndex(
          (point) => Math.abs(point.x - timestamp) < 1000
        );

        let updated: DataPoint[];

        if (existingPointIndex >= 0) {
          updated = [...prev];
          updated[existingPointIndex] = {
            ...updated[existingPointIndex],
            [payload.key]: payload.value,
          };
        } else {
          const newPoint: DataPoint = {
            x: timestamp,
            [payload.key]: payload.value,
          };
          updated = [...prev, newPoint];
        }

        return updated.length > MAX_POINTS
          ? updated.slice(-MAX_POINTS)
          : updated;
      });

      setSensorKeys((prev) => new Set([...prev, payload.key]));
    };

    socket?.on("data", handler);

    return () => {
      socket?.off("data", handler);
    };
  }, [socket, isPaused, isHistoricalMode]);

  const handleApplyTimeRange = () => {
    setIsHistoricalMode(true);
    setIsPaused(true);
  };

  const handleBackToRealTime = () => {
    setIsHistoricalMode(false);
    setIsPaused(false);
    setData([]);
    setSensorKeys(new Set());
  };

  const togglePause = () => {
    if (isHistoricalMode) return;
    setIsPaused(!isPaused);
  };

  // Custom tooltip to show all sensor values at a timestamp
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 p-3 rounded shadow-lg">
          <p className="font-semibold text-gray-200">
            {`Time: ${new Date(label).toLocaleString()}`}
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
    <div className="w-full p-4 space-y-4 bg-gray-900 text-white ">
      {/* Control Panel */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              disabled={isHistoricalMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isHistoricalMode
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : isPaused
                  ? 'bg-green-900 text-green-300 hover:bg-green-800 border border-green-700'
                  : 'bg-red-900 text-red-300 hover:bg-red-800 border border-red-700'
                }`}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            {isHistoricalMode && (
              <button
                onClick={handleBackToRealTime}
                className="flex items-center gap-2 px-3 py-2 bg-blue-900 text-blue-300 hover:bg-blue-800 border border-blue-700 rounded-md text-sm font-medium transition-colors"
              >
                <RotateCcw size={16} />
                Back to Real-time
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className={`w-3 h-3 rounded-full ${isHistoricalMode ? 'bg-orange-500' : isPaused ? 'bg-red-500' : 'bg-green-500'}`} />
            {isHistoricalMode ? 'Historical Mode' : isPaused ? 'Paused' : 'Live'}
          </div>
        </div>

        {/* Timestamp Picker */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <Calendar size={16} />
            Historical Data Range
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">Start Date & Time</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400">End Date & Time</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleApplyTimeRange}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-800 disabled:text-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              <Clock size={16} />
              {isFetching ? 'Loading...' : 'Apply Time Range'}
            </button>

            <div className="text-xs text-gray-400 flex items-center">
              {startDate && endDate && (
                <span>
                  Range: {Math.ceil((new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime()) / (1000 * 60))} minutes
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 bg-gray-800 border border-gray-700 rounded-lg p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="x"
              type="number"
              scale="time"
              domain={xAxisDomain}
              tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
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
      </div>

      {/* Legend */}
      {sensorKeys.size > 0 && (
        <div className="flex flex-wrap gap-4 justify-center bg-gray-800 border border-gray-700 p-3 rounded-lg">
          {Array.from(sensorKeys).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-4 h-0.5 rounded"
                style={{ backgroundColor: keyColorMap[key] }}
              />
              <span className="text-sm text-gray-200">{key}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status Messages */}
      {isError && (
        <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
          Error loading data: {(error as any).message || 'Unknown error'}
        </div>
      )}

      {isFetching && (
        <div className="bg-blue-900 border border-blue-700 text-blue-300 px-4 py-3 rounded-md text-sm">
          Loading data...
        </div>
      )}
    </div>
  );
}
