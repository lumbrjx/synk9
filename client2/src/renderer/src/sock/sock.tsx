import { socket } from '@/App';
import Logs from '@/components/ui/socker-logs';
import { useEffect } from 'react';

export const SocketComponent = () => {

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
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Live Logs</h1>
      {socket ? <Logs socket={socket} /> : <p>Connecting...</p>}
    </div>);
};

