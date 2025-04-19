import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

type LogEntry = { key: string; time: string; value: number };

interface LogsProps {
  socket: Socket;
}

const Logs: React.FC<LogsProps> = ({ socket }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMessage = (message: string) => {
      try {
        const parsed: LogEntry = JSON.parse(message);
        setLogs((prev) => [...prev, parsed]);
      } catch (err) {
        console.error('Failed to parse log message:', err);
      }
    };

    socket.on('message', handleMessage);

    return () => {
      socket.off('message', handleMessage);
    };
  }, [socket]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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

