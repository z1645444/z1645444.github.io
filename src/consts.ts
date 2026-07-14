// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Chromatic';
export const SITE_DESCRIPTION = 'A playful, tactile Toy-Box blog built with Astro.';

export interface Quadrant {
	id: string;
	title: string;
	subtitle: string;
	icon: string;
	colorLight: string;
	colorDark: string;
	url: string;
	description: string;
}

export const QUADRANTS_CONFIG = {
	oddLayout: 'top-heavy' as 'top-heavy' | 'bottom-heavy',
	quadrants: [
		{
			id: 'build',
			title: '建造',
			subtitle: 'BUILD',
			icon: 'wrench',
			colorLight: '#3A828A',
			colorDark: '#8ec07c',
			url: '/category/build',
			description: '构建模块化界面与实物般的数字体验，探索最新的组件拼装工艺。',
		},
		{
			id: 'explore',
			title: '探索',
			subtitle: 'EXPLORE',
			icon: 'compass',
			colorLight: '#8B9E31',
			colorDark: '#b8bb26',
			url: '/category/explore',
			description: '探索未知的边界，发掘有趣的新奇工具、技术与创意设计。',
		},
		{
			id: 'observe',
			title: '观察',
			subtitle: 'OBSERVE',
			icon: 'eye',
			colorLight: '#B55D82',
			colorDark: '#d3869b',
			url: '/category/observe',
			description: '静心观察周围的世界，记录那些闪光的灵感碎片与生活设计思考。',
		},
		{
			id: 'about',
			title: '关于',
			subtitle: 'ABOUT',
			icon: 'info',
			colorLight: '#D65E1E',
			colorDark: '#fe8019',
			url: '/about',
			description: '关于我们、设计主旨以及如何拼装起这套玩具盒界面系统的幕后故事。',
		},
	] as Quadrant[],
};
