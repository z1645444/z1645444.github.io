import { expect, test } from '@playwright/test';

test('remounts the graph after Astro client navigation', async ({ page }) => {
	await page.goto('/musical/');
	await expect(page.locator('#physics-canvas')).toBeVisible();
	await expect(page.locator('#physics-canvas')).toHaveAttribute(
		'data-graph-status',
		/.+/
	);

	await page.locator('.graph-a11y-list [data-node-id="sunset-guitar"]').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#node-title')).toHaveText('日落与吉他');
	await expect(
		page.locator('.graph-a11y-list [data-node-id="sunset-guitar"]')
	).toHaveAttribute('aria-pressed', 'true');

	await page.getByRole('link', { name: '主页' }).click();
	await page.locator('a[href$="category/explore/"]').click();
	await page.getByRole('link', { name: /音律探索图谱/ }).click();

	await expect(page.locator('#physics-canvas')).toBeVisible();
	await expect(page.locator('#physics-canvas')).toHaveAttribute(
		'data-graph-status',
		/.+/
	);
	await page.locator('.graph-a11y-list [data-node-id="echo-fold"]').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#node-title')).toHaveText('回声折叠');
	await expect(
		page.locator('.graph-a11y-list [data-node-id="echo-fold"]')
	).toHaveAttribute('aria-pressed', 'true');
});

test('stops rendering after the graph simulation stabilizes', async ({
	page,
}) => {
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE', {
		timeout: 10_000,
	});
	const stableRenderCount = await canvas.getAttribute('data-render-count');
	await page.waitForTimeout(500);
	await expect(canvas).toHaveAttribute(
		'data-render-count',
		stableRenderCount ?? ''
	);
});

test('redraws settled graph hover states with reduced motion', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	await expect(canvas).toHaveCSS('touch-action', 'none');
	await expect(canvas).toHaveAttribute('data-render-count', /\d+/);
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');

	const radius = Math.min(
		160,
		Math.max(90, Math.min(box.width, box.height) / 3)
	);
	const initialRenderCount = Number(
		await canvas.getAttribute('data-render-count')
	);
	await page.mouse.move(box.x + box.width / 2 + radius, box.y + box.height / 2);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBeGreaterThan(initialRenderCount);

	const hoveredRenderCount = Number(
		await canvas.getAttribute('data-render-count')
	);
	await page.mouse.move(box.x - 10, box.y - 10);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBeGreaterThan(hoveredRenderCount);
});

test('releases dragging when a touch interaction is cancelled', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const radius = Math.min(
		160,
		Math.max(90, Math.min(box.width, box.height) / 3)
	);
	await page.mouse.move(box.x + box.width / 2 + radius, box.y + box.height / 2);
	await page.mouse.down();
	await expect(canvas).toHaveAttribute('data-dragged-node', 'sunset-guitar');
	await expect(canvas).toHaveAttribute('data-graph-status', 'DRAGGING');
	await canvas.dispatchEvent('touchcancel');
	await expect(canvas).not.toHaveAttribute('data-dragged-node', /.+/);
	await expect(canvas).toHaveAttribute('data-graph-status', 'REDUCED');
	await page.mouse.up();
});

test('resets the view immediately when reduced motion is enabled', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	await page.locator('.graph-a11y-list [data-node-id="sunset-guitar"]').focus();
	await page.keyboard.press('Enter');
	const getViewOffset = () =>
		canvas.evaluate((element) => {
			const activeNodeX = Number(element.dataset.activeNodeX);
			const activeNodeY = Number(element.dataset.activeNodeY);
			const activeNodeScreenX = Number(element.dataset.activeNodeScreenX);
			const activeNodeScreenY = Number(element.dataset.activeNodeScreenY);
			return (
				Math.abs(activeNodeScreenX - activeNodeX) +
				Math.abs(activeNodeScreenY - activeNodeY)
			);
		});
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	await page.mouse.move(box.x + 20, box.y + 20);
	await page.mouse.wheel(0, -100);
	await expect.poll(getViewOffset).toBeGreaterThan(1);

	await page.getByRole('button', { name: '复位视角' }).click();
	await expect.poll(getViewOffset).toBeLessThan(0.01);
	await expect(canvas).toHaveAttribute('data-graph-status', 'REDUCED');
});

test('does not reheat the graph when clicking an active node without moving it', async ({
	page,
}) => {
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE', {
		timeout: 10_000,
	});
	await page.locator('.graph-a11y-list [data-node-id="sunset-guitar"]').focus();
	const selectionRenderCount = Number(
		await canvas.getAttribute('data-render-count')
	);
	await page.keyboard.press('Enter');
	await expect(page.locator('#node-title')).toHaveText('日落与吉他');
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBeGreaterThan(selectionRenderCount);
	expect(
		Number(await canvas.getAttribute('data-simulation-alpha'))
	).toBeLessThan(0.1);
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE', {
		timeout: 10_000,
	});
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const selectedNodeX =
		box.x + Number(await canvas.getAttribute('data-active-node-screen-x'));
	const selectedNodeY =
		box.y + Number(await canvas.getAttribute('data-active-node-screen-y'));
	await page.mouse.move(selectedNodeX, selectedNodeY);
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE', {
		timeout: 10_000,
	});

	const renderCount = Number(await canvas.getAttribute('data-render-count'));
	await page.mouse.down();
	await expect(canvas).toHaveAttribute('data-dragged-node', 'sunset-guitar');
	await page.mouse.up();
	await page.waitForTimeout(250);
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE');
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBeLessThanOrEqual(renderCount + 2);
});

test('renders settled hover changes without restarting the simulation', async ({
	page,
}) => {
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	await page.locator('.graph-a11y-list [data-node-id="sunset-guitar"]').focus();
	await page.keyboard.press('Enter');
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE', {
		timeout: 10_000,
	});
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const selectedNodeX =
		box.x + Number(await canvas.getAttribute('data-active-node-screen-x'));
	const selectedNodeY =
		box.y + Number(await canvas.getAttribute('data-active-node-screen-y'));
	await page.mouse.move(box.x + 2, box.y + 2);
	await page.waitForTimeout(50);
	let renderCount = Number(await canvas.getAttribute('data-render-count'));
	await page.mouse.move(selectedNodeX, selectedNodeY);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBeGreaterThan(renderCount);
	renderCount = Number(await canvas.getAttribute('data-render-count'));
	await page.waitForTimeout(250);
	await expect(canvas).toHaveAttribute(
		'data-render-count',
		String(renderCount)
	);
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE');

	await page.mouse.move(box.x + 2, box.y + 2);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBeGreaterThan(renderCount);
	renderCount = Number(await canvas.getAttribute('data-render-count'));
	await page.waitForTimeout(250);
	await expect(canvas).toHaveAttribute(
		'data-render-count',
		String(renderCount)
	);
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE');
});

test('releases dragging when the window loses focus', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const radius = Math.min(
		160,
		Math.max(90, Math.min(box.width, box.height) / 3)
	);
	await page.mouse.move(box.x + box.width / 2 + radius, box.y + box.height / 2);
	await page.mouse.down();
	await expect(canvas).toHaveAttribute('data-dragged-node', 'sunset-guitar');

	await page.evaluate(() => window.dispatchEvent(new Event('blur')));
	await expect(canvas).not.toHaveAttribute('data-dragged-node', /.+/);
	await expect(canvas).toHaveAttribute('data-graph-status', 'REDUCED');
	await page.mouse.up();
});

test('pauses, releases dragging, and restores status across visibility changes', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const radius = Math.min(
		160,
		Math.max(90, Math.min(box.width, box.height) / 3)
	);
	await page.mouse.move(box.x + box.width / 2 + radius, box.y + box.height / 2);
	await page.mouse.down();
	await expect(canvas).toHaveAttribute('data-dragged-node', 'sunset-guitar');

	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', {
			configurable: true,
			value: true,
		});
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect(canvas).not.toHaveAttribute('data-dragged-node', /.+/);
	await expect(canvas).toHaveAttribute('data-graph-status', 'PAUSED');

	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', {
			configurable: true,
			value: false,
		});
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect(canvas).toHaveAttribute('data-graph-status', 'REDUCED');
	await page.mouse.up();
});

test('preserves the pointer offset when dragging from a node edge', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const radius = Math.min(
		160,
		Math.max(90, Math.min(box.width, box.height) / 3)
	);
	const nodeCenterX = box.x + box.width / 2 + radius;
	const nodeCenterY = box.y + box.height / 2;

	await page.mouse.move(nodeCenterX + 30, nodeCenterY);
	await page.mouse.down();
	await expect(canvas).toHaveAttribute('data-dragged-node', 'sunset-guitar');
	await expect(canvas).toHaveAttribute('data-active-node-x', /\d+/);
	const initialNodeX = Number(await canvas.getAttribute('data-active-node-x'));
	await page.mouse.move(nodeCenterX + 40, nodeCenterY);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-active-node-x')))
		.toBeCloseTo(initialNodeX + 10, 1);
	await page.mouse.move(box.x + 1, nodeCenterY);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-active-node-x')))
		.toBe(69);
	await page.mouse.up();
});

test('waits for valid canvas dimensions before starting the simulation', async ({
	page,
}) => {
	await page.addInitScript(() => {
		const observer = new MutationObserver(() => {
			const canvasCard = document.querySelector<HTMLElement>('.canvas-card');
			if (!canvasCard) return;
			canvasCard.dataset.zeroSizedGraphTest = 'true';
			canvasCard.style.setProperty('display', 'none', 'important');
			observer.disconnect();
		});
		observer.observe(document, { childList: true, subtree: true });
	});
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	await expect(canvas).toHaveAttribute('data-graph-status', 'READY');
	await expect(canvas).not.toHaveAttribute('data-render-count', /.+/);

	await page.evaluate(() => {
		const canvasCard = document.querySelector<HTMLElement>('.canvas-card');
		canvasCard?.style.removeProperty('display');
	});
	await expect(canvas).toHaveAttribute('data-render-count', /\d+/);
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE', {
		timeout: 10_000,
	});
});

test('clamps nodes and preserves dragging when the canvas is resized', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const radius = Math.min(
		160,
		Math.max(90, Math.min(box.width, box.height) / 3)
	);
	const nodeCenterX = box.x + box.width / 2 + radius;
	const nodeCenterY = box.y + box.height / 2;

	await page.mouse.move(nodeCenterX, nodeCenterY);
	await page.mouse.down();
	await page.mouse.move(box.x + 1, nodeCenterY);
	await expect(canvas).toHaveAttribute('data-dragged-node', 'sunset-guitar');
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-active-node-x')))
		.toBe(69);

	await page.evaluate(() => {
		const canvasCard = document.querySelector<HTMLElement>('.canvas-card');
		if (canvasCard) canvasCard.style.width = '300px';
	});
	await expect
		.poll(async () => (await canvas.boundingBox())?.width)
		.toBeLessThan(400);
	await expect(canvas).toHaveAttribute('data-dragged-node', 'sunset-guitar');
	const resizedBox = await canvas.boundingBox();
	if (!resizedBox) throw new Error('Resized graph canvas has no bounding box.');
	const resizedBoundary =
		Math.max(
			32,
			Math.min(
				54,
				Math.floor(Math.min(resizedBox.width, resizedBox.height) / 8.5)
			)
		) + 15;
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-active-node-x')))
		.toBe(resizedBoundary);
	await expect(canvas).toHaveAttribute('data-graph-status', 'DRAGGING');
	await page.mouse.move(resizedBox.x + 11, nodeCenterY);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-active-node-x')))
		.toBe(resizedBoundary + 10);
	await page.mouse.up();
	await expect(canvas).not.toHaveAttribute('data-dragged-node', /.+/);
	await expect(canvas).toHaveAttribute('data-graph-status', 'REDUCED');
});

test('reheats after cumulative resize changes cross the threshold', async ({
	page,
}) => {
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	await expect(canvas).toHaveAttribute('data-graph-status', 'STABLE', {
		timeout: 10_000,
	});
	const initialBox = await canvas.boundingBox();
	if (!initialBox) throw new Error('Graph canvas has no bounding box.');
	const initialReheatCount = Number(
		await canvas.getAttribute('data-resize-reheat-count')
	);
	let renderCount = Number(await canvas.getAttribute('data-render-count'));
	const setCanvasWidth = (width: number) =>
		page.evaluate((targetWidth) => {
			const canvasCard = document.querySelector<HTMLElement>('.canvas-card');
			const graphCanvas =
				document.querySelector<HTMLCanvasElement>('#physics-canvas');
			if (!canvasCard || !graphCanvas) return;
			const widthOffset =
				canvasCard.getBoundingClientRect().width -
				graphCanvas.getBoundingClientRect().width;
			canvasCard.style.width = `${targetWidth + widthOffset}px`;
		}, width);

	await setCanvasWidth(initialBox.width * 0.94);
	await expect
		.poll(async () => (await canvas.boundingBox())?.width)
		.toBeLessThan(initialBox.width * 0.96);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBeGreaterThan(renderCount);
	expect(Number(await canvas.getAttribute('data-resize-reheat-count'))).toBe(
		initialReheatCount
	);
	expect(
		Number(await canvas.getAttribute('data-simulation-alpha'))
	).toBeLessThan(0.1);

	renderCount = Number(await canvas.getAttribute('data-render-count'));
	await setCanvasWidth(initialBox.width * 0.88);
	await expect
		.poll(async () =>
			Number(await canvas.getAttribute('data-resize-reheat-count'))
		)
		.toBe(initialReheatCount + 1);
	await expect(canvas).toHaveAttribute('data-graph-status', 'RUNNING');
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBeGreaterThan(renderCount);
});
