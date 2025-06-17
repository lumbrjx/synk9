import { socket } from '@/App';
import React, { useState, useEffect } from 'react';

// Mock components since we don't have access to the actual ones
const Button = ({ children, onClick, className, style, disabled }) => (
  <button onClick={onClick} className={className} style={style} disabled={disabled}>
    {children}
  </button>
);

const Input = ({ value, onChange, className, style, placeholder }) => (
  <input
    type='number'
    value={value}
    onChange={onChange}
    className={className}
    style={style}
    placeholder={placeholder}
  />
);

const Checkbox = ({ checked, onCheckedChange, className, style }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className={className}
    style={style}
  />
);

const Label = ({ children, className }) => (
  <label className={className}>{children}</label>
);


export type HMIConfig = {
  type: 'button' | 'input' | 'checkbox' | 'indicator' | 'gauge';
  id: string;
  label?: string;
  address: string;
  value?: string | boolean | number;
  style?: React.CSSProperties;
  min?: number;
  max?: number;
  unit?: string;
  status?: 'active' | 'inactive' | 'alarm' | 'warning';
};

interface HMIBuilderProps {
  config: HMIConfig[];
  processId: string;
}

export const HMIBuilder: React.FC<HMIBuilderProps> = ({
  config = [
    { type: 'button', id: 'start', label: 'START', address: 'M001', status: 'active' },
    { type: 'button', id: 'stop', label: 'STOP', address: 'M002', status: 'inactive' },
    { type: 'button', id: 'reset', label: 'RESET', address: 'M003' },
    { type: 'input', id: 'setpoint', label: 'Temperature Setpoint', address: 'D001', value: '75.5', unit: '°C' },
    { type: 'input', id: 'pressure', label: 'Pressure Limit', address: 'D002', value: '120', unit: 'PSI' },
    { type: 'checkbox', id: 'auto', label: 'Auto Mode', address: 'M010', value: true },
    { type: 'checkbox', id: 'manual', label: 'Manual Override', address: 'M011', value: false },
    { type: 'indicator', id: 'running', label: 'System Running', address: 'M020', value: true, status: 'active' },
    { type: 'indicator', id: 'alarm', label: 'High Temp Alarm', address: 'M021', value: false, status: 'alarm' },
    { type: 'gauge', id: 'temp', label: 'Current Temperature', address: 'D010', value: 72.3, min: 0, max: 150, unit: '°C' },
    { type: 'gauge', id: 'flow', label: 'Flow Rate', address: 'D011', value: 85.7, min: 0, max: 200, unit: 'L/min' }
  ],
  processId = 'DEMO001'
}) => {
  const [elements, setElements] = useState(config);

  useEffect(() => {
    setElements(config);
  }, [config]);

  const handleChange = (id: string, newValue: string | boolean) => {
    setElements(prev =>
      prev.map(el =>
        el.id === id ? { ...el, value: newValue } : el
      )
    );
  };

  const onButtonClick = (element: HMIConfig) => {
    const inputData = elements
      .filter(el => el.type === 'input' || el.type === 'checkbox')
      .map(({ address, value }) => ({ address, value }));

    socket.emit("order", {
      processId,
      triggerAddress: element.address,
      action: element.label,
      data: inputData,
    });
  };

  const renderGauge = (element: HMIConfig) => {
    const value = Number(element.value) || 0;
    const min = element.min || 0;
    const max = element.max || 100;
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div key={element.id} className="bg-gray-800 border border-gray-600 rounded p-2 h-20">
        <Label className="text-xs font-bold text-gray-300 mb-1 block uppercase tracking-tight">{element.label}</Label>
        <div className="relative h-4 bg-gray-900 rounded border border-gray-700 overflow-hidden mb-1">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-xs font-mono font-bold drop-shadow">
              {value.toFixed(1)} {element.unit}
            </span>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 font-mono">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  };

  const renderIndicator = (element: HMIConfig) => {
    const isActive = Boolean(element.value);
    const getStatusColor = () => {
      if (!isActive) return 'bg-gray-700 border-gray-600';
      switch (element.status) {
        case 'active': return 'bg-green-500 border-green-400 shadow-green-500/50';
        case 'alarm': return 'bg-red-500 border-red-400 shadow-red-500/50 animate-pulse';
        case 'warning': return 'bg-yellow-500 border-yellow-400 shadow-yellow-500/50';
        default: return 'bg-blue-500 border-blue-400 shadow-blue-500/50';
      }
    };

    return (
      <div key={element.id} className="bg-gray-800 border border-gray-600 rounded p-2 h-20">
        <Label className="text-xs font-bold text-gray-300 mb-1 block uppercase tracking-tight">{element.label}</Label>
        <div className="flex items-center gap-2 mt-2">
          <div
            className={`w-4 h-4 rounded-full border transition-all duration-300 ${getStatusColor()}`}
          />
          <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
            {isActive ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
    );
  };

  const renderElement = (element: HMIConfig) => {
    switch (element.type) {
      case 'gauge':
        return renderGauge(element);

      case 'indicator':
        return renderIndicator(element);

      case 'button': {
        const getButtonStyle = () => {
          if (element.label === "ON") {
            return "bg-green-600 hover:bg-green-500 border-green-400 shadow-green-500/30 text-white";
          } else if (element.label === "OFF") {
            return "bg-red-600 hover:bg-red-500 border-red-400 shadow-red-500/30 text-white";
          }
          return "bg-blue-600 hover:bg-blue-500 border-blue-400 shadow-blue-500/30 text-white";
        };

        return (
          <div key={element.id} className="bg-gray-800 border border-gray-600 rounded p-2 h-20">
            <Label className="text-xs font-bold text-gray-300 mb-1 block uppercase tracking-tight">{element.label}</Label>
            <Button
              onClick={() => onButtonClick(element)}
              disabled={false}
              className={`w-full h-10 rounded font-bold text-sm uppercase tracking-wider transition-all duration-200 transform active:scale-95 border shadow ${getButtonStyle()}`}
              style={element.style}
            >
              {element.label}
            </Button>
          </div>
        );
      }

      case 'input':
        return (
          <div key={element.id} className="bg-gray-800 border border-gray-600 rounded p-2 h-20">
            <Label className="text-xs font-bold text-gray-300 mb-1 block uppercase tracking-tight">{element.label}</Label>
            <Input
              value={element.value as string || ''}
              onChange={(e) => handleChange(element.id, e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
              style={element.style}
              placeholder="Enter value..."
            />
            {element.unit && (
              <span className="text-xs text-gray-400 mt-1 block">Unit: {element.unit}</span>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={element.id} className="bg-gray-800 border border-gray-600 rounded p-2 h-20">
            <Label className="text-xs font-bold text-gray-300 mb-1 block uppercase tracking-tight">{element.label}</Label>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                checked={Boolean(element.value)}
                onCheckedChange={(val) => handleChange(element.id, val as boolean)}
                className="w-4 h-4 accent-blue-500 rounded"
                style={element.style}
              />
              <span className={`text-xs font-semibold ${Boolean(element.value) ? 'text-green-400' : 'text-gray-500'}`}>
                {Boolean(element.value) ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen mt-20 bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2">
        <div className="flex justify-between items-center">
          <h1 className="text-sm font-bold text-white uppercase tracking-wider">
            HMI Control
          </h1>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="p-2">
        <div className="grid grid-cols-2 gap-2">
          {elements.map(renderElement)}
        </div>
      </div>

    </div>
  );
};
