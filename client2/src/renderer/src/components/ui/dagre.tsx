import * as dagre from 'dagre'

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 200;
const nodeHeight = 80;

export function getLayoutedElements(nodes: any, edges: any, direction = 'LR') {
	dagreGraph.setGraph({ rankdir: direction });

	nodes.forEach((node: any) => {
		dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	});

	edges.forEach((edge: any) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	nodes.forEach((node: any) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		node.position = {
			x: nodeWithPosition.x - nodeWidth / 2,
			y: nodeWithPosition.y - nodeHeight / 2,
		};
	});

	return { nodes, edges };
}

