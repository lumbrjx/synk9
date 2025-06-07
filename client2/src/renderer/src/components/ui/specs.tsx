import { ReactElement } from 'react';
import {
  Gauge,
  Bell,
  Cpu,
  UserCog,
  Activity
} from 'lucide-react';

type Spec = {
  specName: string;
  count: number;
};

interface SpecsProps {
  specs: Spec[];
}

// Icon mapping based on specName
const iconMap: Record<string, ReactElement> = {
  Alerts: <Bell className="h-6 w-6 text-red-400" />,
  Agents: <UserCog className="h-6 w-6 text-yellow-400" />,
  Sensors: <Gauge className="h-6 w-6 text-sky-400" />,
  Processes: <Cpu className="h-6 w-6 text-green-400" />,
};

export default function Specs({ specs }: SpecsProps): ReactElement {
  return (
    <div className="">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {specs.map((spec, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-lg shadow p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{spec.specName}</p>
                <h3 className="text-3xl font-bold mt-1">{spec.count}</h3>
              </div>
              <div className="bg-primary/20 p-3 rounded-full">
                {iconMap[spec.specName] || <Activity className="h-6 w-6 text-gray-400" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

