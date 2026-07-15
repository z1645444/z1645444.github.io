// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Chromatic';
export const SITE_DESCRIPTION =
	'A playful, tactile Toy-Box blog built with Astro.';
export const SITE_LOCALE = 'zh-CN';

export const QUADRANT_ICON_NAMES = [
	'wrench',
	'compass',
	'eye',
	'info',
] as const;

export type QuadrantIconName = (typeof QUADRANT_ICON_NAMES)[number];

export interface Quadrant {
	id: string;
	kind: 'category' | 'page';
	title: string;
	subtitle: string;
	icon: QuadrantIconName;
	colorLight: string;
	colorDark: string;
	path: string;
	description: string;
}

export const QUADRANTS_CONFIG = {
	oddLayout: 'top-heavy',
	quadrants: [
		{
			id: 'build',
			kind: 'category',
			title: '建造',
			subtitle: 'BUILD',
			icon: 'wrench',
			colorLight: '#689d6a',
			colorDark: '#8ec07c',
			path: 'category/build/',
			description: '构建模块化界面与实物般的数字体验，探索最新的组件拼装工艺。',
		},
		{
			id: 'explore',
			kind: 'category',
			title: '探索',
			subtitle: 'EXPLORE',
			icon: 'compass',
			colorLight: '#98971a',
			colorDark: '#b8bb26',
			path: 'category/explore/',
			description: '探索未知的边界，发掘有趣的新奇工具、技术与创意设计。',
		},
		{
			id: 'observe',
			kind: 'category',
			title: '观察',
			subtitle: 'OBSERVE',
			icon: 'eye',
			colorLight: '#b16286',
			colorDark: '#d3869b',
			path: 'category/observe/',
			description: '静心观察周围的世界，记录那些闪光的灵感碎片与生活设计思考。',
		},
		{
			id: 'about',
			kind: 'page',
			title: '关于',
			subtitle: 'ABOUT',
			icon: 'info',
			colorLight: '#d65d0e',
			colorDark: '#fe8019',
			path: 'about/',
			description:
				'关于我们、设计主旨以及如何拼装起这套玩具盒界面系统的幕后故事。',
		},
	],
} as const satisfies {
	oddLayout: 'top-heavy' | 'bottom-heavy';
	quadrants: readonly Quadrant[];
};

export type QuadrantId = (typeof QUADRANTS_CONFIG.quadrants)[number]['id'];
type QuadrantConfig = (typeof QUADRANTS_CONFIG.quadrants)[number];
type BlogQuadrant = Extract<QuadrantConfig, { kind: 'category' }>;
export type BlogCategoryId = BlogQuadrant['id'];

const blogCategoryIds = QUADRANTS_CONFIG.quadrants
	.filter((quadrant): quadrant is BlogQuadrant => quadrant.kind === 'category')
	.map((quadrant) => quadrant.id);

if (blogCategoryIds.length === 0) {
	throw new Error(
		'QUADRANTS_CONFIG must contain at least one category quadrant.'
	);
}

export const BLOG_CATEGORY_IDS = blogCategoryIds as [
	BlogCategoryId,
	...BlogCategoryId[],
];

export const withBase = (path = ''): string => {
	const baseUrl = import.meta.env.BASE_URL.endsWith('/')
		? import.meta.env.BASE_URL
		: `${import.meta.env.BASE_URL}/`;
	const normalizedPath = path.replace(/^\/+/, '');
	return `${baseUrl}${normalizedPath}`;
};
