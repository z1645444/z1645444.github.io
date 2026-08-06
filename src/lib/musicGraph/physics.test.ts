import assert from 'node:assert/strict';
import test from 'node:test';
import { MUSIC_LINKS, MUSIC_NODES } from '../../data/musicData.ts';
import {
	createGraphLinks,
	createGraphNodes,
	resetNodeLayout,
} from './layout.ts';
import {
	advanceLinkAnimations,
	clampGraphNodePosition,
	graphIsSettled,
	pluckConnectedLinks,
	updateGraphPhysics,
} from './physics.ts';

test('clamps graph nodes within padded bounds', () => {
	const [node] = createGraphNodes(MUSIC_NODES);
	node.x = -100;
	node.y = 1000;
	clampGraphNodePosition(node, 800, 500);
	assert.equal(node.x, node.radius + 15);
	assert.equal(node.y, 500 - node.radius - 15);

	clampGraphNodePosition(node, 100, 100);
	assert.equal(node.x, 50);
	assert.equal(node.y, 50);
});

test('detects stable and active graph states', () => {
	const nodes = createGraphNodes(MUSIC_NODES);
	resetNodeLayout(nodes, 800, 500);
	const links = createGraphLinks(MUSIC_LINKS, nodes);
	assert.equal(graphIsSettled(nodes, links, null), true);
	nodes[0].vx = 1;
	assert.equal(graphIsSettled(nodes, links, null), false);
	nodes[0].vx = 0;
	links[0].plucked = true;
	assert.equal(graphIsSettled(nodes, links, null), false);
});

test('keeps simulated nodes within the graph bounds', () => {
	const nodes = createGraphNodes(MUSIC_NODES);
	resetNodeLayout(nodes, 800, 500);
	const links = createGraphLinks(MUSIC_LINKS, nodes);
	for (let frame = 0; frame < 120; frame += 1) {
		updateGraphPhysics(nodes, links, null, 800, 500);
	}
	assert.ok(
		nodes.every(
			(node) =>
				node.x >= node.radius &&
				node.x <= 800 - node.radius &&
				node.y >= node.radius &&
				node.y <= 500 - node.radius
		)
	);
});

test('does not pluck links when reduced motion is requested', () => {
	const nodes = createGraphNodes(MUSIC_NODES);
	const links = createGraphLinks(MUSIC_LINKS, nodes);
	pluckConnectedLinks(links, nodes[0], true);
	assert.ok(links.every((link) => !link.plucked));
});

test('advances and settles pluck animations outside the renderer', () => {
	const nodes = createGraphNodes(MUSIC_NODES);
	const links = createGraphLinks(MUSIC_LINKS, nodes);
	pluckConnectedLinks(links, nodes[0], false);
	const activeLink = links.find((link) => link.plucked);
	assert.ok(activeLink);
	const initialAmplitude = activeLink.pluckAmplitude;
	advanceLinkAnimations(links);
	assert.ok(activeLink.pluckAmplitude < initialAmplitude);
	for (let frame = 0; frame < 100; frame += 1) advanceLinkAnimations(links);
	assert.equal(activeLink.plucked, false);
});

test('cools the current graph data to a stable state in bounded time', () => {
	const nodes = createGraphNodes(MUSIC_NODES);
	resetNodeLayout(nodes, 900, 600);
	const links = createGraphLinks(MUSIC_LINKS, nodes);
	let alpha = 1;
	let stableFrames = 0;
	let frame = 0;
	for (; frame < 500 && stableFrames < 30; frame += 1) {
		updateGraphPhysics(nodes, links, null, 900, 600, alpha);
		alpha = Math.max(0, alpha * 0.96);
		stableFrames = graphIsSettled(nodes, links, null, alpha)
			? stableFrames + 1
			: 0;
	}
	assert.ok(frame < 500, `graph did not settle after ${frame} frames`);
	assert.equal(stableFrames, 30);
});
