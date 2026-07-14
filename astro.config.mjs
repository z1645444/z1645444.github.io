// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import gruvboxLight from 'shiki/themes/gruvbox-light-soft.mjs';
import gruvboxDark from 'shiki/themes/gruvbox-dark-soft.mjs';

const [githubOwner, githubRepository] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isGitHubUserSite = githubRepository === `${githubOwner}.github.io`;
const inferredSite = githubOwner ? `https://${githubOwner}.github.io` : 'https://example.com';
const inferredBase = githubRepository && !isGitHubUserSite ? `/${githubRepository}` : '/';

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || inferredSite,
	base: process.env.BASE_PATH || inferredBase,
	integrations: [mdx(), sitemap()],
	markdown: {
		shikiConfig: {
			themes: {
				light: gruvboxLight,
				dark: gruvboxDark,
			},
			wrap: true,
		},
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
