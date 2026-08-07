import type { MusicLink, MusicNode } from '../../data/musicData';
import type { GraphLink, GraphNode } from './types';

export function createGraphNodes(nodes: MusicNode[]): GraphNode[] {
	return nodes.map((node) => ({
		...node,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		fx: 0,
		fy: 0,
		radius: 54,
	}));
}

export function updateNodeRadii(
	nodes: GraphNode[],
	width: number,
	height: number
) {
	if (width <= 0 || height <= 0 || nodes.length === 0) return;
	const dynamicRadius = Math.max(
		32,
		Math.min(54, Math.floor(Math.min(width, height) / 8.5))
	);
	nodes.forEach((node) => {
		node.radius = dynamicRadius;
	});
}

export function resetNodeLayout(
	nodes: GraphNode[],
	width: number,
	height: number
) {
	if (width <= 0 || height <= 0 || nodes.length === 0) return;
	updateNodeRadii(nodes, width, height);
	const radius = Math.min(160, Math.max(90, Math.min(width, height) / 3));
	nodes.forEach((node, index) => {
		const angle = (index / nodes.length) * Math.PI * 2;
		node.x = width / 2 + Math.cos(angle) * radius;
		node.y = height / 2 + Math.sin(angle) * radius;
		node.vx = 0;
		node.vy = 0;
	});
}

export function resizeNodeLayout(
	nodes: GraphNode[],
	oldWidth: number,
	oldHeight: number,
	newWidth: number,
	newHeight: number
) {
	if (newWidth <= 0 || newHeight <= 0) return;
	if (oldWidth <= 0 || oldHeight <= 0) {
		resetNodeLayout(nodes, newWidth, newHeight);
		return;
	}
	updateNodeRadii(nodes, newWidth, newHeight);
	const scaleX = newWidth / oldWidth;
	const scaleY = newHeight / oldHeight;
	nodes.forEach((node) => {
		node.x *= scaleX;
		node.y *= scaleY;
	});
}

export function createGraphLinks(
	links: MusicLink[],
	nodes: GraphNode[]
): GraphLink[] {
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	return links.map((link) => {
		const source = nodesById.get(link.source);
		const target = nodesById.get(link.target);
		if (!source || !target) {
			throw new Error(
				`Invalid music link: "${link.source}" -> "${link.target}" references a missing node.`
			);
		}
		return {
			...link,
			source,
			target,
			plucked: false,
			pluckAmplitude: 0,
			pluckPhase: 0,
			pluckDecay: 0.92,
		};
	});
}
