import { MUSIC_NODES, MUSIC_LINKS } from '../data/musicData';
import {
	createGraphLinks,
	createGraphNodes,
	resetNodeLayout,
	resizeNodeLayout,
} from '../lib/musicGraph/layout';
import {
	advanceLinkAnimations,
	clampGraphNodePosition,
	graphIsSettled,
	pluckConnectedLinks,
	stopGraphMotion,
	updateGraphPhysics,
} from '../lib/musicGraph/physics';
import { drawMusicGraph } from '../lib/musicGraph/renderer';
import type { GraphNode } from '../lib/musicGraph/types';

function initMusicGraph(): () => void {
	const eventController = new AbortController();
	const { signal } = eventController;
	const nodesData = MUSIC_NODES;
	const linksData = MUSIC_LINKS;

	function getElement<T extends HTMLElement>(id: string): T {
		const element = document.getElementById(id);
		if (!element)
			throw new Error(`Required graph element "${id}" was not found.`);
		return element as T;
	}

	function getCanvasContext(
		canvasElement: HTMLCanvasElement
	): CanvasRenderingContext2D {
		const context = canvasElement.getContext('2d');
		if (!context) throw new Error('Canvas 2D rendering is not supported.');
		return context;
	}

	const canvas = getElement<HTMLCanvasElement>('physics-canvas');
	if (!(canvas instanceof HTMLCanvasElement)) {
		throw new Error('The graph canvas element has an unexpected type.');
	}
	const ctx = getCanvasContext(canvas);

	const hudNodesCount = getElement('hud-nodes-count');
	const hudLinksCount = getElement('hud-links-count');
	const hudStatus = getElement('hud-status');
	const logScreen = getElement('log-screen');
	const emptyState = getElement('node-empty-state');
	const detailsPanel = getElement('node-details');
	const nodeType = getElement('node-type');
	const nodeTitle = getElement('node-title');
	const nodeDate = getElement('node-date');
	const nodeDescription = getElement('node-description');
	const nodeChords = getElement('node-chords');
	const nodeChordsValue = getElement('node-chords-value');
	const nodeTags = getElement('node-tags');
	const nodeButtons = Array.from(
		document.querySelectorAll<HTMLButtonElement>(
			'.graph-a11y-list [data-node-id]'
		)
	);

	type GraphStatus =
		'READY' | 'RUNNING' | 'STABLE' | 'DRAGGING' | 'PAUSED' | 'REDUCED';
	function setGraphStatus(status: GraphStatus) {
		if (import.meta.env.DEV) canvas.dataset.graphStatus = status;
		if (hudStatus.textContent === status) return;
		hudStatus.textContent = status;
	}

	// HUD 初始化
	hudNodesCount.textContent = String(nodesData.length);
	hudLinksCount.textContent = String(linksData.length);
	setGraphStatus('READY');

	// 状态管理
	let activeNode: GraphNode | null = null;
	let hoveredNode: GraphNode | null = null;
	let draggedNode: GraphNode | null = null;
	let draggedNodeMoved = false;
	let dragStartPointer: { x: number; y: number } | null = null;
	let dragOffset: { x: number; y: number } | null = null;
	let dragPointerClient: { x: number; y: number } | null = null;
	let animationFrame = 0;
	let animationRunning = false;
	let renderFrame = 0;
	let renderPending = false;
	let settledFrames = 0;
	let simulationAlpha = 1;
	const reducedMotionQuery = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	);

	const initialBounds = canvas.getBoundingClientRect();
	let viewportWidth = Math.floor(initialBounds.width);
	let viewportHeight = Math.floor(initialBounds.height);
	let layoutInitialized = viewportWidth > 0 && viewportHeight > 0;

	// 物理引擎节点对象初始化
	const nodes = createGraphNodes(nodesData);

	if (layoutInitialized) resetNodeLayout(nodes, viewportWidth, viewportHeight);

	// 物理引擎连线结构建立
	const links = createGraphLinks(linksData, nodes);

	// 自适应画布大小
	let canvasInitialized = false;
	let pixelRatio = 0;
	function resizeCanvas() {
		const rect = canvas.getBoundingClientRect();
		const newWidth = Math.floor(rect.width);
		const newHeight = Math.floor(rect.height);
		if (newWidth <= 0 || newHeight <= 0) return;
		const nextPixelRatio = Math.max(1, window.devicePixelRatio || 1);
		const dimensionsChanged =
			!canvasInitialized ||
			newWidth !== viewportWidth ||
			newHeight !== viewportHeight;
		const pixelRatioChanged =
			!canvasInitialized || nextPixelRatio !== pixelRatio;
		if (!dimensionsChanged && !pixelRatioChanged) return;
		const shouldReheatForResize =
			!canvasInitialized ||
			Math.abs(newWidth - viewportWidth) / viewportWidth >= 0.1 ||
			Math.abs(newHeight - viewportHeight) / viewportHeight >= 0.1;

		if (dimensionsChanged) {
			if (canvasInitialized) {
				hoveredNode = null;
				canvas.style.cursor = draggedNode ? 'grabbing' : 'default';
			}
			if (!layoutInitialized) {
				resetNodeLayout(nodes, newWidth, newHeight);
				layoutInitialized = true;
			} else if (canvasInitialized) {
				resizeNodeLayout(
					nodes,
					viewportWidth,
					viewportHeight,
					newWidth,
					newHeight
				);
			}
			nodes.forEach((node) =>
				clampGraphNodePosition(node, newWidth, newHeight)
			);
			if (draggedNode && dragPointerClient) {
				const canvasRect = canvas.getBoundingClientRect();
				const pointer = {
					x: dragPointerClient.x - canvasRect.left,
					y: dragPointerClient.y - canvasRect.top,
				};
				dragStartPointer = pointer;
				dragOffset = {
					x: draggedNode.x - pointer.x,
					y: draggedNode.y - pointer.y,
				};
			}
		}

		viewportWidth = newWidth;
		viewportHeight = newHeight;
		pixelRatio = nextPixelRatio;
		canvas.width = Math.round(viewportWidth * pixelRatio);
		canvas.height = Math.round(viewportHeight * pixelRatio);
		ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		canvasInitialized = true;
		if (dimensionsChanged && shouldReheatForResize) {
			startAnimation(true);
		} else {
			requestRender();
		}
	}
	window.addEventListener('resize', resizeCanvas, { signal });
	const resizeObserver = new ResizeObserver(resizeCanvas);
	resizeObserver.observe(canvas);
	resizeCanvas();

	// 物理弹簧琴弦被鼠标划过时触发“拨弦”物理微震动
	function checkLinePluck(mouseX: number, mouseY: number) {
		if (reducedMotionQuery.matches || hoveredNode) return;
		let pluckedLink = false;
		links.forEach((link) => {
			if (!link.source || !link.target) return;
			const x1 = link.source.x;
			const y1 = link.source.y;
			const x2 = link.target.x;
			const y2 = link.target.y;

			// 点到线段距离算法
			const A = mouseX - x1;
			const B = mouseY - y1;
			const C = x2 - x1;
			const D = y2 - y1;

			const dot = A * C + B * D;
			const lenSq = C * C + D * D;
			let param = -1;
			if (lenSq !== 0) param = dot / lenSq;

			let xx, yy;
			if (param < 0) {
				xx = x1;
				yy = y1;
			} else if (param > 1) {
				xx = x2;
				yy = y2;
			} else {
				xx = x1 + param * C;
				yy = y1 + param * D;
			}

			const dx = mouseX - xx;
			const dy = mouseY - yy;
			const distance = Math.sqrt(dx * dx + dy * dy);

			// 如果鼠标距离线段非常近，触发物理拨弦
			if (distance < 12 && !draggedNode) {
				if (!link.plucked) {
					link.plucked = true;
					link.pluckAmplitude = 12; // 初始偏离像素
					link.pluckPhase = 0;
					pluckedLink = true;
				}
			}
		});
		if (pluckedLink) startAnimation();
	}

	// --- 控制面板 UI 交互 ---
	function selectNode(node: GraphNode) {
		if (activeNode === node) return;
		activeNode = node;
		nodeButtons.forEach((button) => {
			button.setAttribute(
				'aria-pressed',
				String(button.dataset.nodeId === node.id)
			);
		});

		logScreen.style.justifyContent = 'flex-start';
		emptyState.hidden = true;
		detailsPanel.hidden = false;
		nodeType.textContent = node.type;
		nodeTitle.textContent = node.title;
		nodeDate.textContent = node.date;
		nodeDescription.textContent = node.description;

		const hasChords = Boolean(node.chords);
		nodeChords.hidden = !hasChords;
		nodeChordsValue.textContent = node.chords ?? '';

		const tagElements = node.tags.map((tag) => {
			const element = document.createElement('span');
			element.className = 'tag-pill';
			element.textContent = `#${tag}`;
			return element;
		});
		nodeTags.replaceChildren(...tagElements);

		pluckConnectedLinks(links, node, reducedMotionQuery.matches);
		startAnimation();
	}
	function updatePhysics() {
		updateGraphPhysics(
			nodes,
			links,
			draggedNode,
			viewportWidth,
			viewportHeight,
			simulationAlpha
		);
	}
	// --- Canvas 图谱渲染逻辑 ---
	function drawGraph() {
		drawMusicGraph({
			ctx,
			nodes,
			links,
			activeNode,
			hoveredNode,
			width: viewportWidth,
			height: viewportHeight,
		});
		if (import.meta.env.DEV) {
			canvas.dataset.renderCount = String(
				Number(canvas.dataset.renderCount ?? 0) + 1
			);
			canvas.dataset.simulationAlpha = String(simulationAlpha);
			if (activeNode) {
				canvas.dataset.activeNodeX = String(activeNode.x);
				canvas.dataset.activeNodeY = String(activeNode.y);
			}
		}
	}
	// --- 物理沙盒事件交互监听 ---
	function getMouseCoords(e: MouseEvent | TouchEvent) {
		const rect = canvas.getBoundingClientRect();
		// 支持移动端 Touch 与 PC 鼠标
		const touch = 'touches' in e ? e.touches[0] : undefined;
		const mouse = e as MouseEvent;
		const clientX = touch?.clientX ?? mouse.clientX;
		const clientY = touch?.clientY ?? mouse.clientY;
		return {
			x: clientX - rect.left,
			y: clientY - rect.top,
			clientX,
			clientY,
		};
	}

	// 检查鼠标在哪个节点内部
	function getNodeAtCoords(x: number, y: number): GraphNode | null {
		for (let i = nodes.length - 1; i >= 0; i--) {
			const node = nodes[i];
			const dx = x - node.x;
			const dy = y - node.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < node.radius) {
				return node;
			}
		}
		return null;
	}

	// 监听鼠标悬停与划过连线
	function handleMouseMove(e: MouseEvent | TouchEvent) {
		const coords = getMouseCoords(e);

		// 1. 悬停判断
		const prevHover = hoveredNode;
		hoveredNode = getNodeAtCoords(coords.x, coords.y);

		if (prevHover !== hoveredNode) {
			if (hoveredNode) {
				canvas.style.cursor = 'grab';
			} else {
				canvas.style.cursor = 'default';
			}
			requestRender();
		}

		// 2. 被拖拽节点锁定跟随
		if (draggedNode) {
			e.preventDefault();
			dragPointerClient = { x: coords.clientX, y: coords.clientY };
			setGraphStatus('DRAGGING');
			canvas.style.cursor = 'grabbing';
			const pointerDistance = dragStartPointer
				? Math.hypot(
						coords.x - dragStartPointer.x,
						coords.y - dragStartPointer.y
					)
				: 0;
			if (draggedNodeMoved || pointerDistance > 2) {
				draggedNodeMoved = true;
				startAnimation(true);
				draggedNode.x = coords.x + (dragOffset?.x ?? 0);
				draggedNode.y = coords.y + (dragOffset?.y ?? 0);
				draggedNode.vx = 0;
				draggedNode.vy = 0;
				clampGraphNodePosition(draggedNode, viewportWidth, viewportHeight);
			}
		}

		// 3. 连线拨弦碰撞物理计算
		checkLinePluck(coords.x, coords.y);
	}

	function handleMouseDown(e: MouseEvent | TouchEvent) {
		const coords = getMouseCoords(e);
		const clickedNode = getNodeAtCoords(coords.x, coords.y);

		if (clickedNode) {
			draggedNode = clickedNode;
			draggedNodeMoved = false;
			dragStartPointer = coords;
			dragPointerClient = { x: coords.clientX, y: coords.clientY };
			dragOffset = {
				x: clickedNode.x - coords.x,
				y: clickedNode.y - coords.y,
			};
			if (import.meta.env.DEV) canvas.dataset.draggedNode = clickedNode.id;
			selectNode(clickedNode);
			setGraphStatus('DRAGGING');
			e.preventDefault();
		}
	}

	function releaseDrag() {
		const wasDragging = Boolean(draggedNode);
		const shouldReheat = draggedNodeMoved;
		draggedNode = null;
		draggedNodeMoved = false;
		dragStartPointer = null;
		dragOffset = null;
		dragPointerClient = null;
		if (import.meta.env.DEV) delete canvas.dataset.draggedNode;
		canvas.style.cursor = hoveredNode ? 'grab' : 'default';
		if (!wasDragging) return;
		if (shouldReheat) {
			startAnimation(true);
		} else {
			startAnimation();
		}
	}

	function handleMouseUp() {
		releaseDrag();
	}

	function handleMouseLeave() {
		hoveredNode = null;
		const wasDragging = Boolean(draggedNode);
		releaseDrag();
		if (!wasDragging) requestRender();
	}

	// 绑定事件
	canvas.addEventListener('mousedown', handleMouseDown, { signal });
	canvas.addEventListener('mousemove', handleMouseMove, { signal });
	canvas.addEventListener('mouseup', handleMouseUp, { signal });
	canvas.addEventListener('mouseleave', handleMouseLeave, { signal });

	canvas.addEventListener('touchstart', handleMouseDown, {
		passive: false,
		signal,
	});
	canvas.addEventListener('touchmove', handleMouseMove, {
		passive: false,
		signal,
	});
	canvas.addEventListener('touchend', handleMouseUp, { signal });
	canvas.addEventListener('touchcancel', handleMouseUp, { signal });

	nodeButtons.forEach((button) => {
		button.addEventListener(
			'click',
			() => {
				const node = nodes.find((item) => item.id === button.dataset.nodeId);
				if (node) selectNode(node);
			},
			{ signal }
		);
	});

	// --- 按需动画循环 ---
	function requestRender() {
		if (document.hidden || animationRunning || renderPending) return;
		renderPending = true;
		renderFrame = requestAnimationFrame(() => {
			renderPending = false;
			drawGraph();
		});
	}

	function graphHasActiveMotion() {
		return (
			simulationAlpha > 0.02 ||
			links.some((link) => link.plucked) ||
			nodes.some((node) => Math.hypot(node.vx, node.vy) >= 0.15)
		);
	}

	function startAnimation(reheat = false) {
		if (!canvasInitialized) return;
		if (reheat) simulationAlpha = 1;
		settledFrames = 0;
		if (document.hidden) {
			setGraphStatus('PAUSED');
			return;
		}
		if (reducedMotionQuery.matches) {
			if (animationRunning) {
				animationRunning = false;
				cancelAnimationFrame(animationFrame);
			}
			setGraphStatus(draggedNode ? 'DRAGGING' : 'REDUCED');
			requestRender();
			return;
		}
		if (!graphHasActiveMotion()) {
			if (animationRunning) {
				animationRunning = false;
				cancelAnimationFrame(animationFrame);
			}
			stopGraphMotion(nodes);
			setGraphStatus(draggedNode ? 'DRAGGING' : 'STABLE');
			requestRender();
			return;
		}
		setGraphStatus(draggedNode ? 'DRAGGING' : 'RUNNING');
		if (animationRunning) return;
		if (renderPending) {
			renderPending = false;
			cancelAnimationFrame(renderFrame);
		}
		animationRunning = true;
		animationFrame = requestAnimationFrame(animationLoop);
	}

	function animationLoop() {
		if (!animationRunning) return;
		updatePhysics();
		advanceLinkAnimations(links);
		simulationAlpha = Math.max(0, simulationAlpha * 0.96);
		drawGraph();

		if (graphIsSettled(nodes, links, null, simulationAlpha)) {
			settledFrames += 1;
		} else {
			settledFrames = 0;
		}

		if (settledFrames >= 30) {
			stopGraphMotion(nodes);
			animationRunning = false;
			setGraphStatus(draggedNode ? 'DRAGGING' : 'STABLE');
			return;
		}
		animationFrame = requestAnimationFrame(animationLoop);
	}

	function handleVisibilityChange() {
		if (document.hidden) {
			releaseDrag();
			animationRunning = false;
			cancelAnimationFrame(animationFrame);
			renderPending = false;
			cancelAnimationFrame(renderFrame);
			setGraphStatus('PAUSED');
			return;
		}
		const wasInitialized = canvasInitialized;
		resizeCanvas();
		if (wasInitialized) startAnimation();
	}

	function destroyGraph() {
		animationRunning = false;
		cancelAnimationFrame(animationFrame);
		renderPending = false;
		cancelAnimationFrame(renderFrame);
		eventController.abort();
		resizeObserver.disconnect();
		themeObserver.disconnect();
	}

	const themeObserver = new MutationObserver(requestRender);
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme'],
	});
	reducedMotionQuery.addEventListener('change', () => startAnimation(true), {
		signal,
	});
	window.addEventListener('blur', releaseDrag, { signal });

	document.addEventListener('visibilitychange', handleVisibilityChange, {
		signal,
	});

	return destroyGraph;
}

let currentGraphCleanup: (() => void) | undefined;
let currentGraphCanvas: HTMLCanvasElement | undefined;

function unmountMusicGraph() {
	currentGraphCleanup?.();
	currentGraphCleanup = undefined;
	currentGraphCanvas = undefined;
}

function mountMusicGraph() {
	const canvas = document.getElementById('physics-canvas');
	if (
		canvas instanceof HTMLCanvasElement &&
		canvas === currentGraphCanvas &&
		currentGraphCleanup
	)
		return;
	unmountMusicGraph();
	if (!(canvas instanceof HTMLCanvasElement)) return;
	currentGraphCanvas = canvas;
	currentGraphCleanup = initMusicGraph();
}

mountMusicGraph();
document.addEventListener('astro:page-load', mountMusicGraph);
document.addEventListener('astro:before-swap', unmountMusicGraph);
window.addEventListener('pagehide', (event) => {
	if (event.persisted) unmountMusicGraph();
});
window.addEventListener('pageshow', (event) => {
	if (event.persisted) mountMusicGraph();
});
