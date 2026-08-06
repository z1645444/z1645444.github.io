import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	use: {
		baseURL: 'http://127.0.0.1:4325',
		headless: true,
	},
});
