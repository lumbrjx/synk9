import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, AlertCircle, RotateCcw, RotateCw } from 'lucide-react';
import { CustomDrawer } from './custom-drawer';
import { Button } from './button';
import { socket } from '@/App';
import { toast } from 'sonner';
import BusIcon from './pumpicon';
import { Rule, RulesInput } from './custom-adder';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useAxiosMutation } from '@/hooks/mutate';
import { create, update } from '@/mutations/agent';
import { queryClient } from '@/main';
import { z } from 'zod';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';

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

const TankNode = ({ data, isConnectable }) => {
  // Default rotation is 0
  const rotation = data.rotation || 0;
  const rotationStyle = { transform: `rotate(${rotation}deg)` };

  return (
    <div className="relative">
      <Handle
        type="target"
        position={rotationAdjustedPosition(Position.Top, rotation)}
        isConnectable={isConnectable}
      />
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-300 mb-1">{data.label || 'Tank'}</div>
        <div style={rotationStyle}>
          <svg width="80" height="100" viewBox="0 0 80 100">
            {/* Tank body */}
            <path d="M15,20 L15,80 Q15,90 25,90 L55,90 Q65,90 65,80 L65,20 Q65,10 55,10 L25,10 Q15,10 15,20 Z"
              fill="#2D3748" stroke="#9CA3AF" strokeWidth="2" />
            {/* Tank level */}
            <path
              d={`M15,${90 - (data.level || 0) * 70} L15,80 Q15,90 25,90 L55,90 Q65,90 65,80 L65,${90 - (data.level || 0) * 70}`}
              fill={data.status === 'warning' ? '#FBBF24' : data.status === 'error' ? '#EF4444' : '#60A5FA'}
              fillOpacity="0.8"
            />
            {/* Level markings */}
            <path d="M15,20 L20,20 M15,35 L20,35 M15,50 L20,50 M15,65 L20,65 M15,80 L20,80" stroke="#9CA3AF" strokeWidth="1" />
            {/* Top connections */}
            <circle cx="30" cy="10" r="3" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1" />
            <circle cx="50" cy="10" r="3" fill="#4B5563" stroke="#9CA3AF" strokeWidth="1" />
            {/* Level percentage */}
            <text x="40" y="50" textAnchor="middle" fill="#E5E7EB" fontSize="12">{Math.round((data.level || 0) * 100)}%</text>
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
              data.onRotate && data.onRotate(data.id, ((data.rotation || 0) + 90) % 360);
            }}
            className="ml-1 p-1 rounded "
          >
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={rotationAdjustedPosition(Position.Bottom, rotation)}
        isConnectable={isConnectable}
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
          <div className="text-xs text-gray-300">{data.rpm ? `${data.rpm} RPM` : data.status || 'stopped'}</div>
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


// Sidebar component for adding new nodes
const Sidebar = ({ onDragStart }) => {
  const componentTypes = [
    { type: 'tank', label: 'Storage Tank', initialData: { level: 0.5, status: 'normal' } },
    { type: 'pump', label: 'Pump', initialData: { status: 'stopped' } },
    { type: 'valve', label: 'Control Valve', initialData: { status: 'closed' } },
    { type: 'motor', label: 'Motor', initialData: { status: 'stopped', rpm: 0 } },
    { type: 'conveyor', label: 'Conveyor', initialData: { status: 'stopped' } },
    { type: 'counter', label: 'Counter', initialData: { value: 0, unit: 'units' } },
    { type: 'sensor', label: 'Sensor', initialData: { status: 'inactive', value: 0, unit: 'C' } },
  ];

  return (
    <div className="w-50 h-240 border-r border-gray-700 p-4 overflow-y-auto">
      <h3 className="font-bold text-gray-200 mb-4">SCADA Components</h3>
      <div className="space-y-6">
        {componentTypes.map((component, index) => {
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
const PropertiesPanel = ({ selectedNode, onNodeUpdate, ...props }) => {
  const [rules, setRules] = useState<Rule[]>([])
  const handleRulesChange = (newRules: Rule[]) => {
    setRules(newRules)
    const updatedProps = {
      ...nodeProps,
      "sensor": newRules
    };
    setNodeProps(updatedProps);
  }
  const [nodeProps, setNodeProps] = useState(selectedNode?.data || {});
  const handleStart = () => {
    props.setIsRunning(true);
    console.log("Process started");
    socket.emit("command", JSON.stringify({ command: "START-PROCESS", data: { id: props.pageId } }))
  };

  const handlePause = () => {
    props.setIsRunning(false);
    console.log("Process paused");
    socket.emit("command", JSON.stringify({ command: "PAUSE-PROCESS", data: { id: props.pageId } }))
  };

  useEffect(() => {
    const handleDiscon = () => {
      toast.error("Lost connection to agent..");
      props.setIsRunning(false);
      try {
      } catch (err) {
        console.error('Failed to parse log message:', err);
      }
    };

    const handleMessage = (message: any) => {
      console.log("i got maee", message);
      try {
        // Extract the first (and only) key dynamically
        const [_eventType, data]: any = Object.entries(message)[0];
        if (data.id !== props.pageId) return;
        console.log("data", data)

        if (!data?.data) return;
        props.setEdges(data.data.edges);
        props.setNodes(data.data.nodes);

      } catch (err) {
        console.error('Failed to parse log message:', err);
      }
    };

    socket.on("agent-disconnected", handleDiscon)
    socket.on('step-data', handleMessage);

    return () => {
      socket.off("agent-disconnected", handleDiscon)
      socket.off('step-data', handleMessage);
    };
  }, [socket]);


  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let processedValue = value;

    console.log(name, value, type)

    if (type === 'number') {
      processedValue = parseFloat(value);
      if (isNaN(processedValue)) processedValue = 0;

      // Apply constraints based on property name
      if (name === 'level') {
        processedValue = Math.max(0, Math.min(1, processedValue));
      }
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
  console.log("immmm", props.buttonDisabled)
  if (!selectedNode) {
    return (

      <div className=" border-l p-4">
        <div className='py-11 flex flex-col justify-between p-4 text-white '>
          <h2 className='text-xl mb-4'>Sidebar</h2>

          <div className="w-full flex flex-col gap-4">
            {props.buttonDisabled ? (
              <Button
                onClick={handlePause}
                className="bg-yellow-300 hover:bg-yellow-200 w-88 text-black"
              >
                Pause Process
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                className="bg-green-300 hover:bg-green-200 w-88 text-black"
              >
                Start Process
              </Button>
            )}

            <Button
              onClick={props.onDelete}
              className="bg-red-300 hover:bg-red-200 w-88 text-black"
              disabled={props.buttonDisabled}
            >
              Remove Process
            </Button>
          </div>
        </div>

        <h3 className="font-bold text-gray-200 mb-4">Properties</h3>
        <p className="text-gray-400 text-sm">Select a component to edit its properties</p>
      </div>
    );
  }

  // Render different property fields based on node type
  const renderPropertyFields = () => {

    switch (selectedNode.type) {
      case 'tank':
        return (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Fill Level (0-1)</label>
              <input
                name="level"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={nodeProps.level || 0}
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
            {selectedNode.type === 'motor' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-300">RPM</label>
                <input
                  name="rpm"
                  type="number"
                  min="0"
                  value={nodeProps.rpm || 0}
                  onChange={handleChange}
                  className="border border-gray-700 rounded-md p-2 text-gray-200"
                />
              </div>
            )}
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


  return (
    <div className="w-72 border-l border-gray-700 p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-200">Properties</h3>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 text-white px-3 py-1 rounded-md text-sm"
        >
          <Save size={14} />
          Apply
        </button>
      </div>

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
        <RulesInput
          value={rules || []}
          onChange={handleRulesChange}
          sensorOptions={props.sensorOpt || []}
        />
        <label className="text-sm text-gray-300 text-white">kwadrado</label>
        <input
          name="kwadrado"
          value={nodeProps.kwadrado || ''}
          onChange={handleChange}
          className="border border-gray-700 rounded-md p-2 "
        />
      </div>

      {renderPropertyFields()}
    </div>
  );
};

// Main FlowBuilder component
export const ScadaFlowBuilder = ({ ...props }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const onConnect = useCallback(
    (params) => {
      // Create styled edge
      const newEdge = {
        ...params,
        style: {
          stroke: '#60A5FA',
          strokeWidth: 3
        },
        animated: true,
        type: 'smoothstep'
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

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
        id: `${type}_${Date.now()}`,
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

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const onNodeUpdate = useCallback(
    (id, data) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, ...data } };
          }
          return node;
        })
      );
    },
    [setNodes]
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
  return (
    <div className="flex text-gray-200">
      <ScrollArea>
        <Sidebar onDragStart={onDragStart} />
      </ScrollArea>


      <div className="flex-1 flex flex-col" ref={reactFlowWrapper}>
        <div className="p-3 border-b border-gray-700 flex justify-between ">
          <h3 className="text-lg font-medium text-gray-200">SCADA System Designer</h3>
          <div className="flex gap-2">
            <button
              onClick={saveFlow}
              className="flex items-center gap-1 text-white px-3 py-1 rounded-md text-sm"
            >
              <Save size={16} />
              Save Configuration
            </button>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          deleteKeyCode="Delete"
          connectionLineStyle={{ stroke: '#60A5FA', strokeWidth: 3 }}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
        </ReactFlow>
      </div>

      <PropertiesPanel
        selectedNode={selectedNode}
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

