import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

type LogEntry = { key: string; time: string; value: number };

interface LogsProps {
  socket: Socket;
  isPaused: boolean;
}

const Logs: React.FC<LogsProps> = ({ socket, isPaused }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Ref to keep track of the latest isPaused value
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      // Check ref current value, not the stale closure
      if (isPausedRef.current) return;

      try {
        const parsed: LogEntry = message;
        setLogs((prev) => [...prev, parsed]);
      } catch (err) {
        console.error('Failed to parse log message:', err);
      }
    };

    socket.on('data', handleMessage);

    return () => {
      socket.off('data', handleMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (isPaused) return;
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isPaused]);

  return (
    <div className="h-64 overflow-y-auto text-purple-300 font-mono p-4 rounded-lg shadow bg-black">
      {logs.map((log, idx) => (
        <div key={idx} className="whitespace-pre-wrap">
          [{log.time}] {log.key}: {log.value}
        </div>
      ))}
      <div ref={logsEndRef} />
    </div>
  );
};

export default Logs;

