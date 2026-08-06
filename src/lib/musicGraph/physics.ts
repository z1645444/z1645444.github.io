import type { GraphLink, GraphNode } from './types';

const GRAVITY = 0.0005;
const REPULSION = 250;
const SPRING_LENGTH = 160;
const SPRING_STIFFNESS = 0.006;
const FRICTION = 0.82;

export function clampGraphNodePosition(
	node: GraphNode,
	width: number,
	height: number
) {
	const padding = node.radius + 15;
	const clampAxis = (value: number, size: number) => {
		if (size <= padding * 2) return size / 2;
		return Math.min(size - padding, Math.max(padding, value));
	};
	const nextX = clampAxis(node.x, width);
	const nextY = clampAxis(node.y, height);
	if (nextX !== node.x) node.vx = 0;
	if (nextY !== node.y) node.vy = 0;
	node.x = nextX;
	node.y = nextY;
}

export function updateGraphPhysics(
	nodes: GraphNode[],
	links: GraphLink[],
	draggedNode: GraphNode | null,
	width: number,
	height: number,
	alpha = 1
) {
	const centerX = width / 2;
	const centerY = height / 2;

	nodes.forEach((node) => {
		node.fx = 0;
		node.fy = 0;
	});

	for (let i = 0; i < nodes.length; i++) {
		const nodeA = nodes[i];
		for (let j = i + 1; j < nodes.length; j++) {
			const nodeB = nodes[j];
			const dx = nodeB.x - nodeA.x;
			const dy = nodeB.y - nodeA.y;
			const distance = Math.hypot(dx, dy) || 1;
			if (distance >= 350) continue;
			const force = REPULSION / (distance + 50);
			const forceX = (dx / distance) * force;
			const forceY = (dy / distance) * force;
			nodeA.fx -= forceX;
			nodeA.fy -= forceY;
			nodeB.fx += forceX;
			nodeB.fy += forceY;
		}
	}

	links.forEach(({ source, target }) => {
		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const distance = Math.hypot(dx, dy) || 1;
		const force = (distance - SPRING_LENGTH) * SPRING_STIFFNESS;
		const forceX = (dx / distance) * force;
		const forceY = (dy / distance) * force;
		source.fx += forceX;
		source.fy += forceY;
		target.fx -= forceX;
		target.fy -= forceY;
	});

	nodes.forEach((node) => {
		if (node === draggedNode) return;
		node.fx += (centerX - node.x) * GRAVITY;
		node.fy += (centerY - node.y) * GRAVITY;
		const forceLength = Math.hypot(node.fx, node.fy) || 1;
		if (forceLength > 2) {
			node.fx = (node.fx / forceLength) * 2;
			node.fy = (node.fy / forceLength) * 2;
		}
		node.vx = (node.vx + node.fx * alpha) * FRICTION;
		node.vy = (node.vy + node.fy * alpha) * FRICTION;
		const speed = Math.hypot(node.vx, node.vy);
		if (speed > 3.5) {
			node.vx = (node.vx / speed) * 3.5;
			node.vy = (node.vy / speed) * 3.5;
		}
		if (Math.abs(node.vx) < 0.06) node.vx = 0;
		if (Math.abs(node.vy) < 0.06) node.vy = 0;
		node.x += node.vx;
		node.y += node.vy;
		clampGraphNodePosition(node, width, height);
	});
}

export function graphIsSettled(
	nodes: GraphNode[],
	links: GraphLink[],
	draggedNode: GraphNode | null,
	alpha = 0
) {
	return (
		!draggedNode &&
		alpha <= 0.02 &&
		links.every((link) => !link.plucked) &&
		nodes.every((node) => Math.hypot(node.vx, node.vy) < 0.15)
	);
}

export function stopGraphMotion(nodes: GraphNode[]) {
	nodes.forEach((node) => {
		node.vx = 0;
		node.vy = 0;
		node.fx = 0;
		node.fy = 0;
	});
}

export function advanceLinkAnimations(links: GraphLink[]) {
	links.forEach((link) => {
		if (!link.plucked) return;
		link.pluckPhase += 0.45;
		link.pluckAmplitude *= link.pluckDecay;
		if (link.pluckAmplitude < 0.2) link.plucked = false;
	});
}

export function pluckConnectedLinks(
	links: GraphLink[],
	node: GraphNode,
	reducedMotion: boolean
) {
	if (reducedMotion) return;
	links.forEach((link) => {
		if (link.source !== node && link.target !== node) return;
		link.plucked = true;
		link.pluckAmplitude = 8;
		link.pluckPhase = 0;
	});
}
