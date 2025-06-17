import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Node,
  Edge,
  getBezierPath,
  EdgeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, AlertCircle, Monitor } from 'lucide-react';
import { Button } from './button';
import { socket } from '@/App';
import { toast } from 'sonner';
import BusIcon from './pumpicon';
import { Rule, RulesInput } from './custom-adder';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useAxiosMutation } from '@/hooks/mutate';
import { update } from '@/mutations/agent';
import { queryClient } from '@/main';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { generateRandomString } from '@/lib/helpers';
import { HMIBuilder, HMIConfig } from './hmi-builder';
import { Input } from './input';

// Helper function to adjust handle positions based on node rotation
const rotationAdjustedPosition = (originalPosition, rotation) => {
  // Normalize rotation to 0, 90, 180, 270 degrees
  const normalizedRotation = ((rotation % 360) + 360) % 360;

  // Map of how positions should change with rotation
  const positionMap = {
    [Position.Top]: [Position.Top, Position.Right, Position.Bottom, Position.Left],
    [Position.Right]: [Position.Right, Position.Bottom, Position.Left, Position.Top],
    [Position.Bottom]: [Position.Bottom, Position.Left, Position.Top, Position.Right],
    [Position.Left]: [Position.Left, Position.Top, Position.Right, Position.Bottom]
  };

  const rotationIndex = Math.floor(normalizedRotation / 90);
  return positionMap[originalPosition][rotationIndex];
};

// Add custom edge component for pipe-like appearance
const CustomEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Outer pipe */}
      <path
        style={{
          ...style,
          strokeWidth: 12,
          stroke: '#4B5563',
          strokeLinecap: 'round',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Inner pipe */}
      <path
        style={{
          ...style,
          strokeWidth: 8,
          stroke: '#60A5FA',
          strokeLinecap: 'round',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Flow animation */}
      <path
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#93C5FD',
          strokeLinecap: 'round',
          strokeDasharray: '5,5',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      >
        <animate
          attributeName="stroke-dashoffset"
          values="0;10"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>
    </>
  );
};

// Update TankNode with simplified color handling
const TankNode = ({ data, isConnectable }) => {
  const rotation = data.rotation || 0;
  const rotationStyle = { transform: `rotate(${rotation}deg)` };
  const liquidColor = data.liquidColor || '#60A5FA';

  const getLiquidColor = () => {
    if (data.status === 'warning') return '#FBBF24';
    if (data.status === 'error') return '#EF4444';
    return liquidColor;
  };

  return (
    <div className="relative">
      <Handle
        type="target"
        position={rotationAdjustedPosition(Position.Top, rotation)}
        isConnectable={isConnectable}
        style={{
          width: 14,
          height: 14,
          background: '#4B5563',
          border: '2px solid #9CA3AF',
          borderRadius: '50%'
        }}
      />
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-300 mb-1">{data.label || 'Tank'}</div>
        <div style={rotationStyle}>
          <svg width="80" height="100" viewBox="0 0 80 100">
            {/* Tank body with industrial look */}
            <path d="M15,20 L15,80 Q15,90 25,90 L55,90 Q65,90 65,80 L65,20 Q65,10 55,10 L25,10 Q15,10 15,20 Z"
              fill="#2D3748" stroke="#9CA3AF" strokeWidth="2" />
            {/* Tank level with custom color */}
            <path
              d={`M15,${90 - (data.level + 0.05 || 0) * 70} L15,80 Q15,90 25,90 L55,90 Q65,90 65,80 L65,${90 - (data.level + 0.05 || 0) * 70}`}
              fill={getLiquidColor()}
              fillOpacity="0.8"
            />
            {/* Industrial-style level markings */}
            <path d="M15,20 L20,20 M15,35 L20,35 M15,50 L20,50 M15,65 L20,65 M15,80 L20,80"
              stroke="#9CA3AF" strokeWidth="1.5" />
            {/* Industrial-style top connections */}
            <circle cx="30" cy="10" r="4" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1.5" />
            <circle cx="50" cy="10" r="4" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1.5" />
            {/* Level percentage with industrial font */}
            <text x="40" y="50" textAnchor="middle" fill="#E5E7EB" fontSize="8" fontFamily="monospace">
              {Math.round((data.level || 0) * 100)}%
            </text>
          </svg>
        </div>
        <div className="flex items-center mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newRotation = ((data.rotation || 0) - 90) % 360;
              data.onRotate && data.onRotate(data.id, newRotation);
            }}
            className="mr-1 p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          {data.status === 'warning' ? (
            <div className="text-yellow-400 text-xs flex items-center">
              <AlertCircle size={12} className="mr-1" />Warning
            </div>
          ) : data.status === 'error' ? (
            <div className="text-red-500 text-xs flex items-center">
              <AlertCircle size={12} className="mr-1" />Error
            </div>
          ) : null}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newRotation = ((data.rotation || 0) + 90) % 360;
              data.onRotate && data.onRotate(data.id, newRotation);
            }}
            className="ml-1 p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M16 3h5v5" />
            </svg>
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={rotationAdjustedPosition(Position.Bottom, rotation)}
        isConnectable={isConnectable}
        style={{
          width: 14,
          height: 14,
          background: '#4B5563',
          border: '2px solid #9CA3AF',
          borderRadius: '50%'
        }}
      />
    </div>
  );
};

const PumpNode = ({ data, isConnectable }) => {
  const rotation = data.rotation || 0;
  const rotationStyle = { transform: `rotate(${rotation}deg)` };

  return (
    <div className="relative">
      <Handle
        type="target"
        position={rotationAdjustedPosition(Position.Left, rotation)}
        isConnectable={isConnectable}
      />
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-300 mb-1">{data.label || 'Pump'}</div>
        <div style={rotationStyle}>
          <BusIcon width={100} />
        </div>
        <div className="flex items-center mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) - 90) % 360);
            }}
            className="mr-1 p-1 rounded "
          >
          </button>
          <div className="text-xs text-gray-300">{data.status || 'stopped'}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) + 90) % 360);
            }}
            className="ml-1 p-1 rounded "
          >
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={rotationAdjustedPosition(Position.Right, rotation)}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const ValveNode = ({ data, isConnectable }) => {
  const rotation = data.rotation || 0;
  const rotationStyle = { transform: `rotate(${rotation}deg)` };
  const isOpen = data.status === 'open';

  return (
    <div className="relative">
      <Handle
        type="target"
        position={rotationAdjustedPosition(Position.Left, rotation)}
        isConnectable={isConnectable}
      />
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-300 mb-1">{data.label || 'Valve'}</div>
        <div style={rotationStyle}>
          <svg width="80" height="60" viewBox="0 0 80 60">
            {/* Valve body */}
            <path d="M5,30 L30,30" stroke="#9CA3AF" strokeWidth="4" fill="none" />
            <path d="M50,30 L75,30" stroke="#9CA3AF" strokeWidth="4" fill="none" />

            {/* Valve center */}
            <circle cx="40" cy="30" r="12"
              fill={isOpen ? '#10B981' : '#EF4444'}
              fillOpacity="0.4"
              stroke="#9CA3AF"
              strokeWidth="2"
            />

            {/* Valve gate with open/close animation */}
            <rect
              x="38"
              y={isOpen ? "8" : "20"}
              width="4"
              height="40"
              fill="#D1D5DB"
              stroke="#9CA3AF"
              strokeWidth="1"
            >
              <animate
                attributeName="y"
                values={isOpen ? "20;8" : "8;20"}
                dur="0.3s"
                fill="freeze"
              />
            </rect>

            {/* Valve actuator */}
            <rect x="32" y="0" width="16" height="8" rx="2" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1" />
          </svg>
        </div>
        <div className="flex items-center mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) - 90) % 360);
            }}
            className="mr-1 p-1 rounded "
          >
          </button>
          <div className="text-xs text-gray-300">{data.status || 'closed'}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) + 90) % 360);
            }}
            className="ml-1 p-1 rounded "
          >
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={rotationAdjustedPosition(Position.Right, rotation)}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const MotorNode = ({ data, isConnectable }) => {
  const rotation = data.rotation || 0;
  const rotationStyle = { transform: `rotate(${rotation}deg)` };
  const isRunning = data.status === 'running';

  return (
    <div className="relative">
      <Handle
        type="target"
        position={rotationAdjustedPosition(Position.Left, rotation)}
        isConnectable={isConnectable}
      />
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-300 mb-1">{data.label || 'Motor'}</div>
        <div style={rotationStyle}>
          <svg width="80" height="70" viewBox="0 0 80 70">
            {/* Motor body */}
            <rect x="15" y="20" width="50" height="30" rx="4" fill="#4B5563" stroke="#9CA3AF" strokeWidth="2" />

            {/* Motor shaft */}
            <rect x="65" y="32.5" width="15" height="5" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1" />

            {/* Motor coil visual */}
            <path d="M25,27 L25,43 M35,27 L35,43 M45,27 L45,43 M55,27 L55,43"
              stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="2,2" />

            {/* Motor mount */}
            <path d="M15,50 L15,55 L65,55 L65,50" fill="#374151" stroke="#9CA3AF" strokeWidth="1" />
            <rect x="20" y="55" width="8" height="5" fill="#374151" stroke="#9CA3AF" strokeWidth="1" />
            <rect x="52" y="55" width="8" height="5" fill="#374151" stroke="#9CA3AF" strokeWidth="1" />

            {/* Motor electrical connection */}
            <rect x="20" y="10" width="12" height="10" fill="#374151" stroke="#9CA3AF" strokeWidth="1" />
            <path d="M26,10 L26,5" stroke="#9CA3AF" strokeWidth="1.5" />

            {/* Rotation indicator */}
            <circle
              cx="75"
              cy="35"
              r="4"
              fill={isRunning ? "#10B981" : "#6B7280"}
            >
              {isRunning && (
                <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Status indicator */}
            <circle
              cx="40"
              cy="35"
              r="8"
              fill={
                data.status === 'running' ? '#10B981' :
                  data.status === 'error' ? '#EF4444' :
                    '#6B7280'
              }
              fillOpacity="0.7"
            />
          </svg>
        </div>
        <div className="flex items-center mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) - 90) % 360);
            }}
            className="mr-1 p-1 rounded "
          >
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) + 90) % 360);
            }}
            className="ml-1 p-1 rounded "
          >
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={rotationAdjustedPosition(Position.Right, rotation)}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const ConveyorNode = ({ data, isConnectable }) => {
  const rotation = data.rotation || 0;
  const rotationStyle = { transform: `rotate(${rotation}deg)` };

  return (
    <div className="relative">
      <Handle
        type="target"
        position={rotationAdjustedPosition(Position.Left, rotation)}
        isConnectable={isConnectable}
      />
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-300 mb-1">{data.label || 'Conveyor'}</div>
        <div style={rotationStyle}>
          <svg width="140" height="60" viewBox="0 0 140 60">
            {/* Conveyor frame */}
            <rect x="10" y="25" width="120" height="10" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1" />

            {/* Support legs */}
            <rect x="20" y="35" width="5" height="15" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1" />
            <rect x="115" y="35" width="5" height="15" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1" />

            {/* End rollers */}
            <circle cx="20" cy="25" r="10" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1.5" />
            <circle cx="120" cy="25" r="10" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1.5" />

            {/* Belt */}
            <path d="M20,15 L120,15 Q130,15 130,25 L130,25 Q130,35 120,35 L20,35 Q10,35 10,25 L10,25 Q10,15 20,15 Z"
              fill="#374151" stroke="#9CA3AF" strokeWidth="1" fillOpacity="0.6" />

            {/* Belt pattern */}
            <path d="M20,15 L30,15 M40,15 L50,15 M60,15 L70,15 M80,15 L90,15 M100,15 L110,15"
              stroke="#9CA3AF" strokeWidth="0.5" strokeDasharray="5,5" />

            {/* Items on belt */}
            {data.status === 'running' ? (
              <>
                <rect x="40" y="10" width="12" height="10" fill="#60A5FA" stroke="#9CA3AF" strokeWidth="0.5">
                  <animate attributeName="x" values="40;90" dur="3s" repeatCount="indefinite" />
                </rect>
                <rect x="70" y="10" width="12" height="10" fill="#60A5FA" stroke="#9CA3AF" strokeWidth="0.5">
                  <animate attributeName="x" values="70;120;40" dur="4s" repeatCount="indefinite" />
                </rect>
              </>
            ) : (
              <rect x="50" y="10" width="12" height="10" fill="#6B7280" stroke="#9CA3AF" strokeWidth="0.5" />
            )}
          </svg>
        </div>
        <div className="flex items-center mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) - 90) % 360);
            }}
            className="mr-1 p-1 rounded "
          >
          </button>
          <div className="text-xs text-gray-300">{data.status || 'stopped'}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) + 90) % 360);
            }}
            className="ml-1 p-1 rounded "
          >
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={rotationAdjustedPosition(Position.Right, rotation)}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const SensorNode = ({ data, isConnectable }) => {
  const rotation = data.rotation || 0;
  const rotationStyle = { transform: `rotate(${rotation}deg)` };

  return (
    <div className="relative">
      <Handle
        type="target"
        position={rotationAdjustedPosition(Position.Left, rotation)}
        isConnectable={isConnectable}
      />
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-300 mb-1">{data.label || 'Sensor'}</div>
        <div style={rotationStyle}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            {/* Sensor housing */}
            <rect x="15" y="15" width="30" height="30" rx="2" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1.5" />

            {/* Sensor lens/element */}
            <circle cx="30" cy="30" r="10"
              fill={data.status === 'active' ? '#10B981' : data.status === 'error' ? '#EF4444' : '#6B7280'}
              fillOpacity="0.7"
              stroke="#9CA3AF"
              strokeWidth="1"
            />

            {/* Sensor rays/beams (for active sensors) */}
            {data.status === 'active' && (
              <g>
                <path d="M5,25 L15,25" stroke="#10B981" strokeWidth="1" strokeDasharray="2,2">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
                </path>
                <path d="M5,30 L15,30" stroke="#10B981" strokeWidth="1" strokeDasharray="2,2">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="0.3s" />
                </path>
                <path d="M5,35 L15,35" stroke="#10B981" strokeWidth="1" strokeDasharray="2,2">
                  <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" begin="0.6s" />
                </path>
              </g>
            )}

            {/* Sensor connections */}
            <path d="M45,30 L55,30" stroke="#9CA3AF" strokeWidth="2" />

            {/* Mounting bracket */}
            <path d="M30,45 L30,55" stroke="#6B7280" strokeWidth="2" />
            <rect x="25" y="55" width="10" height="3" fill="#6B7280" stroke="#9CA3AF" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="flex items-center mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) - 90) % 360);
            }}
            className="mr-1 p-1 rounded "
          >
          </button>
          <div className="text-xs text-gray-300">
            {data.value ? `${data.value} ${data.unit || ''}` : data.status || 'inactive'}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) + 90) % 360);
            }}
            className="ml-1 p-1 rounded "
          >
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={rotationAdjustedPosition(Position.Right, rotation)}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const CounterNode = ({ data, isConnectable }) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-300 mb-1">{data.label || 'Counter'}</div>
      <div className="border border-gray-600 rounded-md p-2 flex flex-col items-center">
        <div className="text-green-400 font-mono text-xl">{data.value || 0}</div>
        <div className="text-xs text-gray-400">{data.unit || 'units'}</div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
  </div>
);

// Define custom node types
const nodeTypes = {
  tank: TankNode,
  pump: PumpNode,
  valve: ValveNode,
  motor: MotorNode,
  conveyor: ConveyorNode,
  counter: CounterNode,
  sensor: SensorNode
};

// Add type definitions
interface NodeData {
  label?: string;
  level?: number;
  status?: string;
  value?: number;
  unit?: string;
  sensor?: Rule[];
  propSensors?: {
    tank_level_sensor?: {
      sensorValue: number;
    };
    counter_sensor?: {
      sensorValue: number;
    };
    temperature_sensor?: {
      sensorValue: number;
    };
  };
  tank_level_sensor?: any;
  counter_sensor?: any;
  tank_max_level?: number;
  note?: string;
  tankColor?: string;
  liquidColor?: string;
  warningColor?: string;
  errorColor?: string;
}

interface CustomNode extends Node {
  data: NodeData;
}

// Sidebar component for adding new nodes
const Sidebar = ({ onDragStart }) => {
  const componentTypes = [
    { type: 'tank', label: 'Storage Tank', initialData: { level: 0.5, status: 'normal' } },
    { type: 'pump', label: 'Pump', initialData: { status: 'stopped' } },
    { type: 'valve', label: 'Control Valve', initialData: { status: 'closed' } },
    { type: 'motor', label: 'Motor', initialData: { status: 'stopped', rpm: 0 } },
    { type: 'conveyor', label: 'Conveyor', initialData: { status: 'stopped' } },
    { type: 'counter', label: 'Counter', initialData: { value: 5, unit: 'units' } },
    { type: 'sensor', label: 'Sensor', initialData: { status: 'inactive', value: 0, unit: 'C' } },
  ];

  return (
    <div className="w-50 h-240 border-r border-gray-700 p-4 overflow-y-auto">
      <h3 className="font-bold text-gray-200 mb-4">SCADA Components</h3>
      <div className="space-y-6">
        {componentTypes.map((component, index) => {
          console.log("INDEX", index)
          const NodeComponent = nodeTypes[component.type];
          return (
            <div
              key={index}
              className="border border-gray-700 rounded-md p-4 cursor-grab hover:bg-gray-700 transition-colors flex justify-center"
              onDragStart={(event) => onDragStart(event, component)}
              draggable
            >
              <NodeComponent data={component.initialData} isConnectable={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Properties panel component
const PropertiesPanel = ({ setSelectedNode, nodeSensors, setNodeSensors, nodeProps, setNodeProps, selectedNode, onNodeUpdate, ...props }) => {

  const [hmiDefinitionVal, setHmiDefinitionVal] = useState("");
  const [hmiConfVal, setHmiConfVal] = useState<HMIConfig[]>([]);
  const [rules, setRules] = useState<Rule[]>([])
  const [_propField, setPropField] = useState([])

  useEffect(() => {
    const config = localStorage.getItem(`hmiConfig-${props.pageId}`)
    console.log("Loading HMI config from localStorage:", config);
    if (!config) {
      console.log("No HMI config found for pageId:", props.pageId);
      return;
    }
    try {
      const conf = JSON.parse(config)
      console.log("Parsed HMI config:", conf);
      setHmiConfVal(conf)
    } catch (e) {
      console.error("Error parsing HMI config:", e);
    }
  }, [props.pageId]);

  console.log("#######################################################", props.sensorOpt);
  // Update nodeProps when selectedNode changes
  useEffect(() => {

    if (selectedNode) {
      console.log("WE NEED THIS", selectedNode.data, selectedNode.data.sensor)
      setNodeProps(selectedNode.data);
      setRules(selectedNode.data.sensor || []);
    }
  }, [selectedNode]);

  const handleRulesChange = (newRules: Rule[]) => {
    setRules(newRules)
    const updatedProps = {
      ...nodeProps,
      "sensor": newRules
    };
    setNodeProps(updatedProps);
  }

  const handlePropFieldChange = (props) => {
    setPropField(props)
    const updatedProps = {
      ...nodeProps,
      "propSensors": props
    };
    setNodeProps(updatedProps);
  }

  const handleStart = () => {
    props.setIsRunning(true);
    console.log("Process started", props.pageId);
    socket.emit("command", JSON.stringify({ command: "START-PROCESS", data: { id: props.pageId } }))
  };

  const handlePause = () => {
    props.setIsRunning(false);
    console.log("Process paused");
    socket.emit("command", JSON.stringify({ command: "PAUSE-PROCESS", data: { id: props.pageId } }))
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let processedValue = value;

    console.log("WAH WAH", name, value, type);
    if (type === 'number') {
      processedValue = parseFloat(value);
      if (isNaN(processedValue)) processedValue = 0;
    }

    const updatedProps = {
      ...nodeProps,
      [name]: processedValue
    };
    setNodeProps(updatedProps);
  };

  const handleStatusChange = (status) => {
    const updatedProps = { ...nodeProps, status };
    setNodeProps(updatedProps);
  };

  const handleSave = () => {
    onNodeUpdate(selectedNode.id, nodeProps);
  };

  const handleCreateHMI = () => {
    try {
      console.log("Creating HMI with definition:", hmiDefinitionVal);
      const hmiDef = JSON.parse(hmiDefinitionVal)
      console.log("Parsed HMI definition:", hmiDef);
      const hmiConfig = hmiDef.map(def => ({ ...def, id: generateRandomString(8) }));
      console.log("Generated HMI config:", hmiConfig);
      setHmiConfVal(hmiConfig);
      localStorage.setItem(`hmiConfig-${props.pageId}`, JSON.stringify(hmiConfig));
      toast.success(`Creating HMI for ${props.pageId}`);
    } catch (e) {
      console.error("Failed to parse json hmi:", e);
      toast.error("Failed to parse HMI definition");
    }
  };

  if (!selectedNode) {
    return (

      <div className="w-88 border-l border-gray-700">
        <div className=' flex flex-col justify-between p-4 text-white '>
          <h2 className='text-xl mb-4'>Sidebar</h2>

          <div className="flex flex-col gap-4">
            {props.buttonDisabled ? (
              <Button
                onClick={handlePause}
                className="bg-yellow-300 hover:bg-yellow-200 text-black"
              >
                Pause Process
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                className="bg-green-300 hover:bg-green-200 text-black"
              >
                Start Process
              </Button>
            )}

            <Button
              onClick={props.onDelete}
              className="bg-red-300 hover:bg-red-200 text-black"
              disabled={props.buttonDisabled}
            >
              Remove Process
            </Button>

            <Input
              className="text-purple-100 h-20"
              placeholder="HMI definition"
              value={hmiDefinitionVal}
              onChange={(e) => {
                setHmiDefinitionVal(e.target.value)
              }}
            />
            <Button
              onClick={handleCreateHMI}
              className="flex items-center gap-1 text-white px-3 py-1 rounded-md text-sm bg-blue-600 hover:bg-blue-700"
            >
              <Monitor size={14} />
              Create HMI
            </Button>
          </div>
        </div>

        <h3 className="ps-4 pt-12 font-bold text-gray-200 mb-4">Properties</h3>
        <p className="ps-4 text-gray-400 text-sm">Select a component to edit its properties</p>
        <HMIBuilder
          processId={props.pageId}
          config={hmiConfVal}
        />
      </div>
    );
  }
  const renderSensorFields = () => {
    console.log("nodessss", nodeSensors);
    return (
      <>
        {nodeSensors && nodeSensors[selectedNode.id] && nodeSensors[selectedNode.id].map((sensor, index) => (
          <div key={sensor.sensor_id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sensor {index + 1}: {sensor.name}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={sensor.sensorValue}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value) || 0;
                  const updatedSensors = [...nodeSensors];
                  updatedSensors[index] = {
                    ...sensor,
                    sensorValue: newValue
                  };

                  // Update the node properties with the new sensor values
                  const newProps = {
                    sensor: updatedSensors
                  };

                  setNodeProps(newProps);
                }}
                placeholder="Sensor Value"
              />
              <span className="text-sm text-gray-500">Value</span>
            </div>
          </div>
        ))}
        {nodeSensors && nodeSensors.length === 0 && (
          <div className="text-sm text-gray-500 py-2">No sensors available for this node.</div>
        )}
      </>
    );
  }
  // Render different property fields based on node type
  const renderPropertyFields = (sensors: any) => {

    switch (selectedNode.type) {
      case 'tank':
        return (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Liquid Color</label>
              <input
                type="color"
                name="liquidColor"
                value={nodeProps.liquidColor || '#60A5FA'}
                onChange={handleChange}
                className="w-full h-8 rounded-md cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Fill Level sensor</label>
              <Select
                name='level'
                onValueChange={(d) => handlePropFieldChange({ tank_level_sensor: d })}
                defaultValue={''}
              >
                <SelectTrigger className="text-purple-100 w-full">
                  <SelectValue placeholder={"temperature sensor"} />
                </SelectTrigger>
                <SelectContent>
                  {sensors?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Max Tank Level (cm)</label>
              <input
                name="tank_max_level"
                type='number'
                value={nodeProps.tank_max_level || 300}
                onChange={handleChange}
                className="border border-gray-700 rounded-md p-2 text-gray-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {['normal', 'warning', 'error'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`p-2 rounded-md text-sm capitalize ${nodeProps.status === status
                      ? 'text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      case 'pump':
      case 'motor':
        return (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {['running', 'stopped', 'error'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`p-2 rounded-md text-sm capitalize ${nodeProps.status === status
                      ? 'text-white'
                      : 'text-gray-300 '
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      case 'valve':
        return (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {['open', 'closed'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`p-2 rounded-md text-sm capitalize ${nodeProps.status === status
                    ? 'text-white'
                    : 'text-gray-300 '
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        );
      case 'conveyor':
        return (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {['running', 'stopped'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`p-2 rounded-md text-sm capitalize ${nodeProps.status === status
                    ? 'text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        );
      case 'counter':
        return (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Value Sensor</label>
              <Select
                name='value'
                onValueChange={(d) => handlePropFieldChange({ counter_sensor: d })}
                defaultValue={''}
              >
                <SelectTrigger className="text-purple-100 w-full">
                  <SelectValue placeholder={"counter sensor"} />
                </SelectTrigger>
                <SelectContent>
                  {sensors?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Unit</label>
              <input
                name="unit"
                value={nodeProps.unit || 'units'}
                onChange={handleChange}
                className="border border-gray-700 rounded-md p-2 text-gray-200"
              />
            </div>
          </>
        );
      case 'sensor':
        return (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {['active', 'inactive', 'error'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`p-2 rounded-md text-sm capitalize ${nodeProps.status === status
                      ? 'text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Value</label>
              <input
                name="value"
                type="number"
                value={nodeProps.value || 0}
                onChange={handleChange}
                className="border border-gray-700 rounded-md p-2 text-gray-200"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Unit</label>
              <input
                name="unit"
                value={nodeProps.unit || ''}
                onChange={handleChange}
                className="border border-gray-700 rounded-md p-2 text-gray-200"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };
  console.log("is me dis", props.buttonDisabled);


  return (
    <div className="w-88 border-l border-gray-700 p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-200">Properties</h3>
        <div className="flex gap-2">
          {!props.buttonDisabled && (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 text-white px-3 py-1 rounded-md text-sm"
              >
                <Save size={14} />
                Apply
              </button>

            </>
          )}
        </div>
      </div>

      {!Boolean(props.buttonDisabled) && <>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-300">Label</label>
          <input
            name="label"
            value={nodeProps.label || ''}
            onChange={handleChange}
            className="border border-gray-700 rounded-md p-2 text-gray-200"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-300">Sensors</label>
          <RulesInput
            value={rules || []}
            onChange={handleRulesChange}
            sensorOptions={props.sensorOpt || []}
          />
          <label className="text-sm text-gray-300 text-white">Note</label>
          <input
            name="note"
            value={nodeProps.note || ''}
            onChange={handleChange}
            className="border border-gray-700 rounded-md p-2 "
          />
        </div></>}

      {!Boolean(props.buttonDisabled) && renderPropertyFields(props.sensorOpt)}
      {renderSensorFields()}
    </div >
  );
};

// Main FlowBuilder component
export const ScadaFlowBuilder = ({ ...props }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState<CustomNode | null>(null);
  const [nodeProps, setNodeProps] = useState<NodeData>({});
  const [nodeSensors, setNodeSensors] = useState<Record<string, any>>({});

  const calculateTankLevel = (rawValue: number, minValue = 0, maxValue = 300) => {
    // Ensure minValue is less than maxValue
    if (minValue >= maxValue) {
      console.error("Min value must be less than max value");
      return 0;
    }

    // Calculate the normalized level (0-1)
    const normalizedLevel = (rawValue - minValue) / (maxValue - minValue);

    // Clamp the value between 0 and 1
    const clampedLevel = Math.max(0, Math.min(1, normalizedLevel));

    console.log(`Raw sensor value: ${rawValue}, Normalized: ${normalizedLevel.toFixed(4)}, Clamped: ${clampedLevel.toFixed(4)}`);

    return clampedLevel;
  };

  const onNodeClick = useCallback((_, node: CustomNode) => {
    console.log("Node clicked:", node);
    setSelectedNode(node);
    setNodeProps(node.data);
  }, []);

  const onNodeUpdate = useCallback(
    (id: string, data: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            const updatedNode = { ...node, data: { ...node.data, ...data } };
            if (selectedNode && selectedNode.id === id) {
              setSelectedNode(updatedNode);
              setNodeProps(updatedNode.data);
            }
            return updatedNode;
          }
          return node;
        })
      );
    },
    [setNodes, selectedNode]
  );

  // Update nodeProps when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      setNodeProps(selectedNode.data);
    }
  }, [selectedNode]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = (reactFlowWrapper?.current as any).getBoundingClientRect();

      // Get component data from drag event
      const rawData = event.dataTransfer.getData('application/json');
      if (!rawData) return;

      const componentData = JSON.parse(rawData);
      const { type, label, initialData } = componentData;

      const position = (reactFlowInstance as any).project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}_${Date.now()}_${generateRandomString(13)}`,
        type,
        position,
        data: {
          ...initialData,
          label
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const createMutation = useAxiosMutation({
    mutationFn: (data: any) =>
      update("/process/flow/" + props.pageId, data),
    options: {
      onSuccess: () => {
        toast.success("Process Configuration created successfully!");

        queryClient.invalidateQueries({ queryKey: ['steps'] });
      },
      onError: (e) => {
        console.error("Create error", e);
        toast.error("Failed to create process step.");
      }
    }
  });
  const onDragStart = (event, component) => {
    const componentData = JSON.stringify(component);
    event.dataTransfer.setData('application/json', componentData);
    event.dataTransfer.effectAllowed = 'move';
  };

  const saveFlow = () => {
    const flow = { nodes, edges };
    console.log("to save", flow)
    createMutation.mutate(flow);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };
  const {
    data: process,
    isLoading,
    isError,
    error,
    isFetching,
    status
  } = useAxiosQuery({
    queryKey: ['oneProcess'],
    queryFn: async () => {
      try {
        console.log("Fetching agents...");
        const response = await query('/process/' + props.pageId);
        console.log("Fetch response:", response);
        return response;
      } catch (e) {
        console.error("Fetch error:", e);
        throw e;
      }
    },
    options: {
      refetchOnWindowFocus: false,
      retry: 2,
    }
  });
  useEffect(() => {
    console.log("Query status changed:", status);
    console.log("isLoading:", isLoading);
    console.log("isFetching:", isFetching);
    if (process && process.flow) {
      setEdges(process.flow.edges);
      setNodes(process.flow.nodes);
      console.log(process.flow.nodes)
    }
    if (isError) {
      console.error("Error details:", error);
    }
  }, [status, isLoading, isFetching, process, isError, error]);

  useEffect(() => {
    const handleDiscon = () => {
      toast.error("Lost connection to agent..");
      props.setIsRunning(false);
    };

    socket.on("agent-disconnected", handleDiscon);

    return () => {
      socket.off("agent-disconnected", handleDiscon);
    };
  }, [socket, props.setIsRunning]);

  const handleMessage = (message: any) => {
    console.log("Received message:", message);
    try {
      // Extract the first (and only) key dynamically
      const [_eventType, data]: any = Object.entries(message)[0];
      if (data.id !== props.pageId) return;

      if (!data?.data) return;

      // Update all nodes with their respective sensor data
      setNodes((nds) =>
        nds.map((n) => {
          const nodeData = data.data.nodes.find((node: any) => node.id === n.id);
          if (nodeData?.data?.propSensors) {
            const updates = { ...n.data };

            // Handle tank level updates
            if (nodeData.data.propSensors.tank_level_sensor) {
              const rawValue = nodeData.data.propSensors.tank_level_sensor.sensorValue;
              updates.level = calculateTankLevel(rawValue, 0, updates.tank_max_level || 300);
            }

            // Handle counter updates
            if (nodeData.data.propSensors.counter_sensor) {
              updates.value = nodeData.data.propSensors.counter_sensor.sensorValue;
            }

            // Handle temperature updates
            if (nodeData.data.propSensors.temperature_sensor) {
              updates.value = nodeData.data.propSensors.temperature_sensor.sensorValue;
              updates.unit = '°C';
            }

            return { ...n, data: updates };
          }
          return n;
        })
      );

      // Update selected node's sensors if it exists
      if (selectedNode) {
        const selectedNodeData = data.data.nodes.find((node: any) => node.id === selectedNode.id);
        if (selectedNodeData?.data?.sensor) {
          setNodeSensors({ [selectedNode.id]: selectedNodeData.data.sensor });
        }
      }
    } catch (err) {
      console.error('Failed to parse log message:', err);
    }
  };

  useEffect(() => {
    socket.on('step-data', handleMessage);

    return () => {
      socket.off('step-data', handleMessage);
    };
  }, [socket, selectedNode]);

  // Add alert handling
  useEffect(() => {
    const handleAlert = (message: any) => {
      console.log("Received alert:", message);
      try {
        const alert = message["alert:alert"].data.alert;
        console.log("Processing alert:", {
          type: alert.alertType,
          message: alert.message,
          rules: alert.rules
        });

        // Find nodes that have sensors matching the alert's rules
        setNodes((nds) =>
          nds.map((node) => {
            console.log("Checking node:", {
              id: node.id,
              type: node.type,
              sensors: node.data.sensor,
              propSensor: node.data.propSensors
            });

            // Check if node has sensors that match the alert rules
            const hasMatchingSensor = node.data.sensor?.some((sensor: any) => {
              const matches = alert.rules?.some((rule: any) => {
                console.log("Comparing sensor:", {
                  sensorId: sensor.sensor_id,
                  ruleMemoryAddress: rule.memoryAddress,
                  ruleAgentId: rule.agentId,
                  sensor: sensor,
                  rule: rule,
                  sensorAgentId: sensor.agentId,
                  sensorMemoryAddress: sensor.register,
                  ruleId: rule.id,
                  matches: sensor.sensor_id === rule.sensor_id
                });
                return sensor.register === rule.memoryAddress;
              });
              return matches;
            });

            if (hasMatchingSensor) {
              const updates = { ...node.data };
              updates.status = alert.alertType === 'warning' ? 'warning' : 'error';
              return { ...node, data: updates };
            }
            return node;
          })
        );
      } catch (err) {
        console.error('Failed to parse alert message:', err);
      }
    };

    socket.on('alert:alert', handleAlert);

    return () => {
      socket.off('alert:alert', handleAlert);
    };
  }, [socket]);

  const edgeTypes = {
    custom: CustomEdge,
  };

  return (
    <div className="flex text-gray-200">
      <ScrollArea>
        {!props.buttonDisabled && <Sidebar onDragStart={onDragStart} />}
      </ScrollArea>

      <div className="flex-1 flex flex-col h-240" ref={reactFlowWrapper}>
        <div className="p-3 border-b border-gray-700 flex justify-between ">
          <h3 className="text-lg font-medium text-gray-200">SCADA System Designer</h3>
          <div className="flex gap-2">
            {!props.buttonDisabled && <button
              onClick={saveFlow}
              className="flex items-center gap-1 text-white px-3 py-1 rounded-md text-sm"
            >
              <Save size={16} />
              Save Configuration
            </button>}
          </div>
        </div>

        <ReactFlow
          className='h-240'
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(params) => {
            const newEdge = {
              ...params,
              type: 'custom',
              animated: true,
            };
            setEdges((eds) => addEdge(newEdge, eds));
          }}
          onInit={setReactFlowInstance as any}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          deleteKeyCode="Delete"
          connectionLineStyle={{ stroke: '#60A5FA', strokeWidth: 2 }}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{ type: 'custom' }}
        >
        </ReactFlow>
      </div>

      <PropertiesPanel
        nodeSensors={nodeSensors}
        setNodeSensors={setNodeSensors}
        nodeProps={nodeProps}
        setNodeProps={setNodeProps}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        onNodeUpdate={onNodeUpdate}
        formSchema={props.formSchema}
        formFields={props.formFields}
        defaultValues={props.defaultValues}
        onSubmit={(d: any) => props.onSubmit(d)}
        drawerDescription="Add a new process step to the system."
        drawerTitle="Add New Process Step"
        buttonDisabled={props.buttonDisabled}
        topic="Add Process Step"
        setIsRunning={(d) => props.setIsRunning(d)}
        setNodes={(d) => setNodes(d)}
        setEdges={(d) => setEdges(d)}
        onDelete={() => props.onDelete()}
        pageId={props.pageId}
        sensorOpt={props.sensorOpt}
      />
    </div>
  );
};
