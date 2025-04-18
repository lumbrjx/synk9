import { socket } from '@/App';
import { useEffect, useState } from 'react';

export const SocketComponent = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected:', socket.id);
    });

    socket.on('message', (data) => {
      console.log('Message received:', data);
      setMessage(data);
    });

    return () => {
      socket.off('connect');
      socket.off('message');
    };
  }, []);

  return <div>Message from server: { message } </div>;
};

