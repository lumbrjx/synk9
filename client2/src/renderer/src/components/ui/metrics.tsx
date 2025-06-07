import { useState, useEffect } from 'react';
import { socket } from '@/App';
import RealTimeChart from '@/components/ui/graph';
import Logs from '@/components/ui/socker-logs';
import Specs from '@/components/ui/specs';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';

export default function Metrics() {
  const [specs, setSpecs] = useState<{ specName: string, count: number }[]>([]);

  useAxiosQuery({
    queryKey: ['specs'],
    queryFn: async () => {
      try {
        const response = await query('/alert-topic');
        const response2 = await query('/agent');
        const response3 = await query('/sensor');
        const response4 = await query('/process');

        setSpecs([
          { specName: 'Alerts', count: response?.length || 0 },
          { specName: 'Agents', count: response2?.length || 0 },
          { specName: 'Sensors', count: response3?.length || 0 },
          { specName: 'Processes', count: response4?.length || 0 },
        ]);

        return { response, response2, response3 };
      } catch (e) {
        console.error('Fetch error:', e);
        throw e;
      }
    },
    options: {
      refetchOnWindowFocus: true,
      retry: 10,
    },
  });

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected:', socket.id);
    });

    return () => {
      socket.off('connect');
      socket.off('data');
    };
  }, []);

  return (
    <div>
      <div style={{ width: '100%' }}>
        <RealTimeChart socket={socket} />
      </div>

      <div className="flex flex-col md:flex-row bg-gray-900 pt-2 px-5 gap-16">
        <div className="w-full md:w-2/3">
          <Logs socket={socket} />
        </div>
        <Specs specs={specs} />
      </div>
    </div>
  );
}

