import type { GraphLink, GraphNode } from './types';

export function drawMusicGraph({
	ctx,
	nodes,
	links,
	activeNode,
	hoveredNode,
	width: viewportWidth,
	height: viewportHeight,
}: {
	ctx: CanvasRenderingContext2D;
	nodes: GraphNode[];
	links: GraphLink[];
	activeNode: GraphNode | null;
	hoveredNode: GraphNode | null;
	width: number;
	height: number;
}) {
	ctx.clearRect(0, 0, viewportWidth, viewportHeight);

	// 绘制亮暗模式下的网格参考线
	const isDark =
		document.documentElement.getAttribute('data-theme') === 'dark' ||
		(!document.documentElement.getAttribute('data-theme') &&
			window.matchMedia('(prefers-color-scheme: dark)').matches);

	ctx.strokeStyle = isDark
		? 'rgba(235, 219, 178, 0.04)'
		: 'rgba(40, 40, 40, 0.04)';
	ctx.lineWidth = 1;
	const gridSize = 40;
	for (let x = 0; x < viewportWidth; x += gridSize) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, viewportHeight);
		ctx.stroke();
	}
	for (let y = 0; y < viewportHeight; y += gridSize) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(viewportWidth, y);
		ctx.stroke();
	}

	// 1. 绘制物理连线（弹簧琴弦）
	links.forEach((link) => {
		if (!link.source || !link.target) return;
		const x1 = link.source.x;
		const y1 = link.source.y;
		const x2 = link.target.x;
		const y2 = link.target.y;

		// 物理连线颜色根据亮/暗模式微调
		const lineStroke = isDark ? '#7c6f64' : '#b0a496';
		ctx.strokeStyle =
			activeNode && (link.source === activeNode || link.target === activeNode)
				? isDark
					? '#fabd2f'
					: '#b57614'
				: lineStroke;

		// 根据连线类型确定线宽与虚线配置
		ctx.lineWidth = link.type === 'derivative' ? 4 : 2;

		ctx.beginPath();
		if (link.type === 'inspiration') {
			ctx.setLineDash([6, 6]);
		} else {
			ctx.setLineDash([]);
		}

		// 如果琴弦处于“拨弦震动中”
		if (link.plucked) {
			const midX = (x1 + x2) / 2;
			const midY = (y1 + y2) / 2;

			// 法线方向计算
			const dx = x2 - x1;
			const dy = y2 - y1;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			const nx = -dy / len;
			const ny = dx / len;

			const offset = Math.sin(link.pluckPhase) * link.pluckAmplitude;
			const cx = midX + nx * offset;
			const cy = midY + ny * offset;

			// 二次贝塞尔曲线绘制振幅偏移
			ctx.moveTo(x1, y1);
			ctx.quadraticCurveTo(cx, cy, x2, y2);
		} else {
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
		}
		ctx.stroke();
		ctx.setLineDash([]);

		// 绘制连线上方的说明文本（悬停在端点上时才明亮显示，平时淡化）
		const isLinkHovered =
			hoveredNode &&
			(link.source === hoveredNode || link.target === hoveredNode);
		ctx.fillStyle = isLinkHovered
			? isDark
				? '#ebdbb2'
				: '#282828'
			: 'rgba(124, 111, 100, 0.4)';
		ctx.font = 'bold 10px monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const labelText =
			link.type === 'derivative'
				? '衍生'
				: link.type === 'inspiration'
					? '灵感'
					: '共鸣';

		const textX = (x1 + x2) / 2;
		const textY = (y1 + y2) / 2 - 10;

		// 绘制一个极小的背景遮挡面板，增强文字可读性
		if (isLinkHovered) {
			const textWidth = ctx.measureText(labelText).width;
			ctx.fillStyle = isDark ? '#282828' : '#fbf1c7';
			ctx.fillRect(textX - textWidth / 2 - 4, textY - 6, textWidth + 8, 12);
			ctx.strokeStyle = isDark ? '#7c6f64' : '#282828';
			ctx.strokeRect(textX - textWidth / 2 - 4, textY - 6, textWidth + 8, 12);
			ctx.fillStyle = isDark ? '#ebdbb2' : '#282828';
		}
		ctx.fillText(labelText, textX, textY);
	});

	// 2. 绘制节点（物理积木圆盘）
	nodes.forEach((node) => {
		const nodeColor = isDark ? node.color.dark : node.color.light;
		const nodeBorder = isDark ? '#7c6f64' : '#282828';

		ctx.save();
		ctx.translate(node.x, node.y);

		const isActive = activeNode === node;
		const isHovered = hoveredNode === node;

		// 2.1 绘制积木下方的实体物理硬阴影 (营造立体按键悬浮感)
		ctx.fillStyle = isDark ? '#1d2021' : '#282828';
		const shadowOffset = isActive ? 2 : isHovered ? 6 : 4;
		ctx.beginPath();
		ctx.arc(shadowOffset, shadowOffset, node.radius, 0, Math.PI * 2);
		ctx.fill();

		// 2.2 绘制节点积木主体圆盘
		ctx.fillStyle = nodeColor;
		ctx.strokeStyle = nodeBorder;
		// 悬停/激活加粗边框
		ctx.lineWidth = isActive ? 5 : isHovered ? 4 : 3;

		ctx.beginPath();
		ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		// 2.3 如果是当前激活项，环绕一圈轨道发光
		if (isActive) {
			ctx.strokeStyle = isDark ? '#fabd2f' : '#b57614';
			ctx.lineWidth = 2;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.arc(0, 0, node.radius + 6, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// 2.4 绘制乐器圆盘内部同心圆线条 (黑胶唱片螺纹感)
		ctx.strokeStyle = 'rgba(255,255,255,0.12)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(0, 0, node.radius - 12, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(0, 0, node.radius - 24, 0, Math.PI * 2);
		ctx.stroke();

		// 2.5 绘制文字标签
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 13px Atkinson, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// 自动换行或分行渲染，使纽扣显得整齐
		if (node.title.length > 5) {
			// 截半换行
			const mid = Math.floor(node.title.length / 2);
			const part1 = node.title.substring(0, mid);
			const part2 = node.title.substring(mid);
			ctx.fillText(part1, 0, -8);
			ctx.fillText(part2, 0, 8);
		} else {
			ctx.fillText(node.title, 0, 0);
		}

		// 2.6 绘制外挂的小小类型标识 (比如 [Jam] 或 [Synth])
		ctx.fillStyle = isDark ? '#ebdbb2' : '#282828';
		ctx.font = 'bold 9px monospace';
		const typeLabel = node.type.split(' ')[0];
		const tw = ctx.measureText(typeLabel).width;

		ctx.fillStyle = isDark ? '#1d2021' : '#fbf1c7';
		ctx.fillRect(-tw / 2 - 4, node.radius - 4, tw + 8, 10);
		ctx.strokeRect(-tw / 2 - 4, node.radius - 4, tw + 8, 10);

		ctx.fillStyle = isDark ? '#ebdbb2' : '#282828';
		ctx.fillText(typeLabel, 0, node.radius + 1);

		ctx.restore();
	});
}
