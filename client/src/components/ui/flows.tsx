import { useState } from 'react';
import ReactFlow, { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { Check, X, Play, Clock, AlertCircle } from 'lucide-react';

const StatusNode = ({ data, isConnectable }: any) => {
	const getStatusIcon = () => {
		switch (data.status) {
			case 'success':
				return <Check className="text-white" size={16} />;
			case 'failed':
				return <X className="text-white" size={16} />;
			case 'running':
				return <Play className="text-white" size={16} />;
			case 'pending':
				return <Clock className="text-white" size={16} />;
			default:
				return <AlertCircle className="text-white" size={16} />;
		}
	};

	const getStatusColor = () => {
		switch (data.status) {
			case 'success': return 'bg-green-600';
			case 'failed': return 'bg-red-600';
			case 'running': return 'bg-blue-600';
			case 'pending': return 'bg-gray-500';
			default: return 'bg-gray-600';
		}
	};

	return (
		<div className="relative">
			<Handle
				type="target"
				position={Position.Left}
				isConnectable={isConnectable}
				className="-left-1"
			/>
			<div className={`flex items-center p-3 rounded-md border border-gray-300 bg-[#1b1b1d] text-purple-100 shadow-sm`}>
				<div className={`flex items-center justify-center rounded-full mr-3 p-1 ${getStatusColor()}`}>
					{getStatusIcon()}
				</div>
				<div>
					<div className="font-medium text-purple-100">{data.label}</div>
					{data.duration && (
						<div className="text-xs text-purple-300">{data.duration}</div>
					)}
				</div>
			</div>
			<Handle
				type="source"
				position={Position.Right}
				isConnectable={isConnectable}
				className="-right-1"
			/>
		</div>
	);
};

// Define custom node types
const nodeTypes = {
	status: StatusNode,
};

export default function FlowCanvas() {
	// Define nodes in GitHub pipeline style with status
	const [nodes] = useState([
		{
			id: '1',
			data: {
				label: 'Build',
				status: 'pending',
				duration: '2m 34s'
			},
			position: { x: 50, y: 50 },
			type: 'status'
		},
		{
			id: '2',
			data: {
				label: 'Test',
				status: 'failed',
				duration: '1m 12s'
			},
			position: { x: 250, y: 50 },
			type: 'status'
		},
		{
			id: '3',
			data: {
				label: 'Lint',
				status: 'success',
				duration: '42s'
			},
			position: { x: 450, y: 50 },
			type: 'status'
		},
		{
			id: '4',
			data: {
				label: 'Deploy',
				status: 'running',
				duration: '1m 3s'
			},
			position: { x: 650, y: 50 },
			type: 'status'
		},
	]);

	const [edges] = useState([
		{
			id: 'e1-2',
			source: '1',
			target: '2',
			style: { stroke: '#d1d5db', strokeWidth: 2 },
			animated: false,
		},
		{
			id: 'e2-3',
			source: '2',
			target: '3',
			style: { stroke: '#d1d5db', strokeWidth: 2 },
			animated: false,
		},
		{
			id: 'e3-4',
			source: '3',
			target: '4',
			style: { stroke: '#d1d5db', strokeWidth: 2 },
			animated: true,
		},
	]);

	return (
		<div className="w-full h-120 border border-gray-200 rounded-md">
			<div className="p-3 border-b border-gray-200">
				<h3 className="text-sm font-medium text-purple-100">Workflow: main.yml</h3>
			</div>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				fitView
				minZoom={0.5}
				maxZoom={2}
				nodesDraggable={false}
				nodesConnectable={false}
				elementsSelectable={false}
			>
			</ReactFlow>
		</div>
	);
}
