import ReactFlow, { Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { Check, X, Play, Clock, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import { getLayoutedElements } from './dagre';

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

export default function FlowCanvas({ steps, setStepSideView }: any) {
	const initialNodes = useMemo(() => {
		return steps.map((step: any) => ({
			id: step.id,
			data: {
				label: step.name,
				status: 'pending', // Or use real status if you have it
				duration: 0, // Same
			},
			position: { x: 0, y: 0 },
			type: 'status',
		}));
	}, [steps]);

	const initialEdges = useMemo(() => {
		const edges = [];

		for (const step of steps) {
			if (step.from && step.from.id) {
				edges.push({
					id: `e${step.from.id}-${step.id}`,
					source: step.from.id,
					target: step.id,
					style: { stroke: '#d1d5db', strokeWidth: 2 },

					animated: true,
				});
			}

			if (step.to && step.to.id) {
				edges.push({
					id: `e${step.id}-${step.to.id}`,
					source: step.id,
					target: step.to.id,
					style: { stroke: '#d1d5db', strokeWidth: 2 },
				});
			}
		}

		return edges;
	}, [steps]);


	const { nodes, edges } = useMemo(
		() => getLayoutedElements(initialNodes, initialEdges),
		[initialNodes, initialEdges]
	);

	return (
		<div className="w-full h-120 ">
			<div className="p-3 border-b border-gray-100">
				<h3 className="text-sm font-medium text-purple-100">Workflow</h3>
			</div>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				fitView
				nodesDraggable={true}
				nodesConnectable={false}
				onNodeClick={(_event, node) => setStepSideView(node.data)} 
				elementsSelectable={true}
			/>
		</div>
	);
}

