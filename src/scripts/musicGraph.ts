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

const RESIZE_REHEAT_RATIO = 0.1;

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
	const hudStatus = document.getElementById('hud-status');
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
		if (!hudStatus || hudStatus.textContent === status) return;
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

	// Canvas 视角平移 (Pan) 与 缩放 (Zoom) 状态
	let panX = 0;
	let panY = 0;
	let zoom = 1;
	let targetPanX = 0;
	let targetPanY = 0;
	let targetZoom = 1;

	let isPanning = false;
	let panStartPointer: { x: number; y: number } | null = null;
	let panStartOffset: { x: number; y: number } | null = null;

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
	let lastResizeReheatWidth = 0;
	let lastResizeReheatHeight = 0;
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
			Math.abs(newWidth - lastResizeReheatWidth) / lastResizeReheatWidth >=
				RESIZE_REHEAT_RATIO ||
			Math.abs(newHeight - lastResizeReheatHeight) / lastResizeReheatHeight >=
				RESIZE_REHEAT_RATIO;

		if (dimensionsChanged) {
			if (canvasInitialized) {
				hoveredNode = null;
				canvas.style.cursor = draggedNode ? 'grabbing' : 'default';
				resizeNodeLayout(
					nodes,
					viewportWidth,
					viewportHeight,
					newWidth,
					newHeight
				);
			} else {
				resetNodeLayout(nodes, newWidth, newHeight);
				layoutInitialized = true;
			}
			nodes.forEach((node) =>
				clampGraphNodePosition(node, newWidth, newHeight)
			);
			if (draggedNode && dragPointerClient) {
				const canvasRect = canvas.getBoundingClientRect();
				const canvasPointer = {
					x: dragPointerClient.x - canvasRect.left,
					y: dragPointerClient.y - canvasRect.top,
				};
				const worldPointer = {
					x: (canvasPointer.x - panX) / zoom,
					y: (canvasPointer.y - panY) / zoom,
				};
				dragStartPointer = canvasPointer;
				dragOffset = {
					x: draggedNode.x - worldPointer.x,
					y: draggedNode.y - worldPointer.y,
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
			lastResizeReheatWidth = newWidth;
			lastResizeReheatHeight = newHeight;
			if (import.meta.env.DEV) {
				canvas.dataset.resizeReheatCount = String(
					Number(canvas.dataset.resizeReheatCount ?? 0) + 1
				);
			}
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
			if (distance < 12 && !draggedNode && !isPanning) {
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

	// --- 控制面板 UI 交互与节点自动居中 ---
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

		// 选定节点时平滑移动视角，将目标节点居中呈现在画布上半区域，避免被控制面板遮挡
		targetPanX = viewportWidth / 2 - node.x * zoom;
		targetPanY = Math.max(
			-viewportHeight * 0.35,
			Math.min(viewportHeight * 0.35, viewportHeight * 0.42 - node.y * zoom)
		);

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
			panX,
			panY,
			zoom,
		});
		if (import.meta.env.DEV) {
			canvas.dataset.renderCount = String(
				Number(canvas.dataset.renderCount ?? 0) + 1
			);
			canvas.dataset.simulationAlpha = String(simulationAlpha);
			if (activeNode) {
				canvas.dataset.activeNodeX = String(activeNode.x);
				canvas.dataset.activeNodeY = String(activeNode.y);
				canvas.dataset.activeNodeScreenX = String(activeNode.x * zoom + panX);
				canvas.dataset.activeNodeScreenY = String(activeNode.y * zoom + panY);
			}
		}
	}

	// 转换屏幕坐标为世界坐标 (受 pan 与 zoom 影响)
	function getPointerWorldCoords(e: MouseEvent | TouchEvent) {
		const rect = canvas.getBoundingClientRect();
		const touch =
			'touches' in e && e.touches.length > 0 ? e.touches[0] : undefined;
		const mouse = e as MouseEvent;
		const clientX = touch?.clientX ?? mouse.clientX;
		const clientY = touch?.clientY ?? mouse.clientY;

		const canvasX = clientX - rect.left;
		const canvasY = clientY - rect.top;

		const worldX = (canvasX - panX) / zoom;
		const worldY = (canvasY - panY) / zoom;

		return {
			x: worldX,
			y: worldY,
			canvasX,
			canvasY,
			clientX,
			clientY,
		};
	}

	// 检查世界坐标下是否击中节点
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

	// 监听鼠标/触控移动
	function handleMouseMove(e: MouseEvent | TouchEvent) {
		const coords = getPointerWorldCoords(e);

		// 0. 画布背景拖拽平移中
		if (isPanning && panStartPointer && panStartOffset) {
			if (e.cancelable) e.preventDefault();
			panX = panStartOffset.x + (coords.clientX - panStartPointer.x);
			panY = panStartOffset.y + (coords.clientY - panStartPointer.y);
			targetPanX = panX;
			targetPanY = panY;
			requestRender();
			return;
		}

		// 1. 节点悬停判断
		const prevHover = hoveredNode;
		hoveredNode = getNodeAtCoords(coords.x, coords.y);

		if (prevHover !== hoveredNode) {
			if (hoveredNode) {
				canvas.style.cursor = 'grab';
			} else if (!isPanning) {
				canvas.style.cursor = 'default';
			}
			requestRender();
		}

		// 2. 被拖拽节点跟随
		if (draggedNode) {
			if (e.cancelable) e.preventDefault();
			dragPointerClient = { x: coords.clientX, y: coords.clientY };
			setGraphStatus('DRAGGING');
			canvas.style.cursor = 'grabbing';
			const pointerDistance = dragStartPointer
				? Math.hypot(
						coords.canvasX - dragStartPointer.x,
						coords.canvasY - dragStartPointer.y
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
		const coords = getPointerWorldCoords(e);
		const clickedNode = getNodeAtCoords(coords.x, coords.y);

		if (clickedNode) {
			draggedNode = clickedNode;
			draggedNodeMoved = false;
			dragStartPointer = { x: coords.canvasX, y: coords.canvasY };
			dragPointerClient = { x: coords.clientX, y: coords.clientY };
			dragOffset = {
				x: clickedNode.x - coords.x,
				y: clickedNode.y - coords.y,
			};
			if (import.meta.env.DEV) canvas.dataset.draggedNode = clickedNode.id;
			selectNode(clickedNode);
			const selectedCoords = getPointerWorldCoords(e);
			dragOffset = {
				x: clickedNode.x - selectedCoords.x,
				y: clickedNode.y - selectedCoords.y,
			};
			setGraphStatus('DRAGGING');
			if (e.cancelable) e.preventDefault();
		} else {
			// 点击空白背景开启画布平移拖拽
			isPanning = true;
			panStartPointer = { x: coords.clientX, y: coords.clientY };
			panStartOffset = { x: panX, y: panY };
			canvas.style.cursor = 'grabbing';
			setGraphStatus('DRAGGING');
		}
	}

	function releaseDrag() {
		const wasDraggingNode = Boolean(draggedNode);
		const wasPanning = isPanning;
		isPanning = false;
		panStartPointer = null;
		panStartOffset = null;
		draggedNode = null;
		draggedNodeMoved = false;
		dragStartPointer = null;
		dragOffset = null;
		dragPointerClient = null;
		if (import.meta.env.DEV) delete canvas.dataset.draggedNode;
		canvas.style.cursor = hoveredNode ? 'grab' : 'default';
		if (wasDraggingNode || wasPanning) {
			startAnimation();
		}
	}

	function handleMouseUp() {
		releaseDrag();
	}

	function handleMouseLeave() {
		hoveredNode = null;
		const wasActive = Boolean(draggedNode || isPanning);
		releaseDrag();
		if (!wasActive) requestRender();
	}

	function handleWheel(e: WheelEvent) {
		if (e.cancelable) e.preventDefault();
		const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
		const nextZoom = Math.max(0.6, Math.min(2.0, zoom * zoomFactor));
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		panX = mouseX - (mouseX - panX) * (nextZoom / zoom);
		panY = mouseY - (mouseY - panY) * (nextZoom / zoom);
		targetPanX = panX;
		targetPanY = panY;
		zoom = nextZoom;
		targetZoom = zoom;
		startAnimation();
	}

	// 绑定复位视角按钮
	const resetBtn = document.getElementById('hud-reset-view');
	if (resetBtn) {
		resetBtn.addEventListener(
			'click',
			() => {
				targetPanX = 0;
				targetPanY = 0;
				targetZoom = 1;
				startAnimation();
			},
			{ signal }
		);
	}

	// 绑定事件
	canvas.addEventListener('mousedown', handleMouseDown, { signal });
	canvas.addEventListener('mousemove', handleMouseMove, { signal });
	canvas.addEventListener('mouseup', handleMouseUp, { signal });
	canvas.addEventListener('mouseleave', handleMouseLeave, { signal });
	canvas.addEventListener('wheel', handleWheel, { passive: false, signal });

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
			nodes.some((node) => Math.hypot(node.vx, node.vy) >= 0.15) ||
			Math.abs(targetPanX - panX) > 0.4 ||
			Math.abs(targetPanY - panY) > 0.4 ||
			Math.abs(targetZoom - zoom) > 0.005
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
			panX = targetPanX;
			panY = targetPanY;
			zoom = targetZoom;
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

		// 视角平滑过渡 (Lerp) 动画
		if (
			Math.abs(targetPanX - panX) > 0.1 ||
			Math.abs(targetPanY - panY) > 0.1 ||
			Math.abs(targetZoom - zoom) > 0.001
		) {
			panX += (targetPanX - panX) * 0.15;
			panY += (targetPanY - panY) * 0.15;
			zoom += (targetZoom - zoom) * 0.15;
		}

		updatePhysics();
		advanceLinkAnimations(links);
		simulationAlpha = Math.max(0, simulationAlpha * 0.96);
		drawGraph();

		if (
			graphIsSettled(nodes, links, null, simulationAlpha) &&
			Math.abs(targetPanX - panX) <= 0.5 &&
			Math.abs(targetPanY - panY) <= 0.5 &&
			Math.abs(targetZoom - zoom) <= 0.005
		) {
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
