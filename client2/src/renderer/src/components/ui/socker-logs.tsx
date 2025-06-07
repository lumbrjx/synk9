import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

type LogEntry = { key: string; time: string; value: number };

interface LogsProps {
  socket: Socket;
}

const Logs: React.FC<LogsProps> = ({ socket }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true);

  // Track if user is at the bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // More generous tolerance and better calculation
      const atBottom = Math.abs(scrollHeight - clientHeight - scrollTop) <= 5;
      isUserAtBottomRef.current = atBottom;
      setShowScrollButton(!atBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleMessage = (message: any) => {
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

  // Auto-scroll effect - runs after logs update
  useEffect(() => {
    if (isUserAtBottomRef.current && containerRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    }
  }, [logs]);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-64 overflow-y-auto text-purple-300 font-mono p-4 rounded-lg shadow bg-gray-800"
      >
        {logs.map((log, idx) => (
          <div key={idx} className="whitespace-pre-wrap">
            [{log.time}] {log.key}: {log.value}
          </div>
        ))}
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-2 right-2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
          title="Scroll to bottom"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Logs;
