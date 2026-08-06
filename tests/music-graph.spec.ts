import { expect, test } from '@playwright/test';

test('remounts the graph after Astro client navigation', async ({ page }) => {
	await page.goto('/musical/');
	await expect(page.locator('#physics-canvas')).toBeVisible();

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
	await expect(page.locator('#hud-status')).toHaveText('STABLE', {
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
	await expect(page.locator('#hud-status')).toHaveText('DRAGGING');
	await canvas.dispatchEvent('touchcancel');
	await expect(canvas).not.toHaveAttribute('data-dragged-node', /.+/);
	await expect(page.locator('#hud-status')).toHaveText('REDUCED');
	await page.mouse.up();
});

test('does not reheat the graph when clicking an active node without moving it', async ({
	page,
}) => {
	await page.goto('/musical/');
	const canvas = page.locator('#physics-canvas');
	await expect(page.locator('#hud-status')).toHaveText('STABLE', {
		timeout: 10_000,
	});
	await page.locator('.graph-a11y-list [data-node-id="sunset-guitar"]').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#node-title')).toHaveText('日落与吉他');
	await page.waitForTimeout(150);
	expect(
		Number(await canvas.getAttribute('data-simulation-alpha'))
	).toBeLessThan(0.1);
	await expect(page.locator('#hud-status')).toHaveText('STABLE', {
		timeout: 10_000,
	});
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const nodeX = Number(await canvas.getAttribute('data-active-node-x'));
	const nodeY = Number(await canvas.getAttribute('data-active-node-y'));
	await page.mouse.move(box.x + nodeX, box.y + nodeY);
	await expect(page.locator('#hud-status')).toHaveText('STABLE', {
		timeout: 10_000,
	});

	const renderCount = Number(await canvas.getAttribute('data-render-count'));
	await page.mouse.down();
	await expect(canvas).toHaveAttribute('data-dragged-node', 'sunset-guitar');
	await page.mouse.up();
	await page.waitForTimeout(250);
	await expect(page.locator('#hud-status')).toHaveText('STABLE');
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
	await expect(page.locator('#hud-status')).toHaveText('STABLE', {
		timeout: 10_000,
	});
	const box = await canvas.boundingBox();
	if (!box) throw new Error('Graph canvas has no bounding box.');
	const nodeX = Number(await canvas.getAttribute('data-active-node-x'));
	const nodeY = Number(await canvas.getAttribute('data-active-node-y'));
	let renderCount = Number(await canvas.getAttribute('data-render-count'));
	await canvas.dispatchEvent('mousemove', {
		clientX: box.x + nodeX,
		clientY: box.y + nodeY,
	});
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBe(renderCount + 1);
	await page.waitForTimeout(250);
	await expect(canvas).toHaveAttribute(
		'data-render-count',
		String(renderCount + 1)
	);
	await expect(page.locator('#hud-status')).toHaveText('STABLE');

	renderCount += 1;
	await canvas.dispatchEvent('mousemove', {
		clientX: box.x + 2,
		clientY: box.y + 2,
	});
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-render-count')))
		.toBe(renderCount + 1);
	await page.waitForTimeout(250);
	await expect(canvas).toHaveAttribute(
		'data-render-count',
		String(renderCount + 1)
	);
	await expect(page.locator('#hud-status')).toHaveText('STABLE');
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
	await expect(page.locator('#hud-status')).toHaveText('REDUCED');
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
	await expect(page.locator('#hud-status')).toHaveText('PAUSED');

	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', {
			configurable: true,
			value: false,
		});
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect(page.locator('#hud-status')).toHaveText('REDUCED');
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
	await expect(page.locator('#hud-status')).toHaveText('READY');
	await expect(canvas).not.toHaveAttribute('data-render-count', /.+/);

	await page.evaluate(() => {
		const canvasCard = document.querySelector<HTMLElement>('.canvas-card');
		canvasCard?.style.removeProperty('display');
	});
	await expect(canvas).toHaveAttribute('data-render-count', /\d+/);
	await expect(page.locator('#hud-status')).toHaveText('STABLE', {
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
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-active-node-x')))
		.toBe(69);
	await expect(page.locator('#hud-status')).toHaveText('DRAGGING');
	const resizedBox = await canvas.boundingBox();
	if (!resizedBox) throw new Error('Resized graph canvas has no bounding box.');
	await page.mouse.move(resizedBox.x + 11, nodeCenterY);
	await expect
		.poll(async () => Number(await canvas.getAttribute('data-active-node-x')))
		.toBe(79);
	await page.mouse.up();
	await expect(canvas).not.toHaveAttribute('data-dragged-node', /.+/);
	await expect(page.locator('#hud-status')).toHaveText('REDUCED');
});
