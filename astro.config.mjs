// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';
import gruvboxLight from 'shiki/themes/gruvbox-light-soft.mjs';
import gruvboxDark from 'shiki/themes/gruvbox-dark-soft.mjs';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const [githubOwner, githubRepository] = (
	process.env.GITHUB_REPOSITORY ?? ''
).split('/');
const isGitHubUserSite = githubRepository === `${githubOwner}.github.io`;
const inferredSite = githubOwner
	? `https://${githubOwner}.github.io`
	: 'https://example.com';
const inferredBase =
	githubRepository && !isGitHubUserSite ? `/${githubRepository}` : '/';
const site = process.env.SITE_URL || env.SITE_URL || inferredSite;
const base = process.env.BASE_PATH || env.BASE_PATH || inferredBase;

if (process.argv.includes('build') && site === 'https://example.com') {
	process.emitWarning(
		'SITE_URL is not configured. Canonical URLs, RSS, and sitemap output will use example.com.'
	);
}

// https://astro.build/config
export default defineConfig({
	site,
	base,
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
