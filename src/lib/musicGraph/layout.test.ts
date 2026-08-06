import assert from 'node:assert/strict';
import test from 'node:test';
import { MUSIC_LINKS, MUSIC_NODES } from '../../data/musicData.ts';
import {
	createGraphLinks,
	createGraphNodes,
	resetNodeLayout,
	resizeNodeLayout,
} from './layout.ts';

test('initializes a valid layout after starting with zero-sized bounds', () => {
	const nodes = createGraphNodes(MUSIC_NODES);
	resizeNodeLayout(nodes, 0, 0, 800, 500);
	assert.ok(
		nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))
	);
	assert.ok(nodes.some((node) => node.x > 400));
	assert.ok(nodes.some((node) => node.x < 400));
});

test('scales an existing layout with its container', () => {
	const nodes = createGraphNodes(MUSIC_NODES);
	resetNodeLayout(nodes, 800, 500);
	const previous = nodes.map(({ x, y }) => ({ x, y }));
	resizeNodeLayout(nodes, 800, 500, 400, 250);
	nodes.forEach((node, index) => {
		assert.equal(node.x, previous[index].x / 2);
		assert.equal(node.y, previous[index].y / 2);
	});
});

test('rejects graph links that reference missing nodes', () => {
	const nodes = createGraphNodes(MUSIC_NODES.slice(0, 1));
	assert.throws(() => createGraphLinks(MUSIC_LINKS, nodes), /missing node/);
});
