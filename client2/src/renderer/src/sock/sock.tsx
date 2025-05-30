import { socket } from '@/App';
import RealTimeChart from '@/components/ui/graph';
import Logs from '@/components/ui/socker-logs';
import { CheckCircle, ListStart, Pause, Play, TriangleRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export const SocketComponent = () => {
  const [isPaused, setIsPaused] = useState(false);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected:', socket.id);
    });

    return () => {
      socket.off('connect');
      socket.off('data');
    };
  }, [socket]);

  return (
    <>


      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Live Logs</h1>
        <div className='flex'>

          <button
            onClick={togglePause}
            className={`mt-4 px-4 py-2 rounded-lg font-small text-md transition-colors ${isPaused
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
          >
            {isPaused ? <Play/> : <Pause />}
          </button>
          <p className={`${isPaused ? 'text-red-600' : 'text-green-600'} text-sm`}>
            {isPaused ? 'Updates Paused' : 'Live Updates'}
          </p>
        </div>

        {socket ? <Logs socket={socket} isPaused={isPaused} /> : <p>Connecting...</p>}
        <div style={{ width: '100%', margin: 'auto' }}>
          <h1 className='text-xl font-semibold mt-4'>Log Chart</h1>
          <RealTimeChart socket={socket} isPaused={isPaused} />

        </div>
      </div>
    </>
  );

};

