import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { BLOG_CATEGORY_IDS } from './consts';

const dateMatches = (pubDateInput: unknown, pathDateStr: string): boolean => {
	if (!pubDateInput) return false;

	if (pubDateInput instanceof Date) {
		// YAML parses bare dates as UTC midnight, so we use UTC components
		const year = pubDateInput.getUTCFullYear();
		const month = String(pubDateInput.getUTCMonth() + 1).padStart(2, '0');
		const day = String(pubDateInput.getUTCDate()).padStart(2, '0');
		return `${year}-${month}-${day}` === pathDateStr;
	}

	const str = String(pubDateInput).trim();
	const parts = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
	if (parts) {
		return `${parts[1]}-${parts[2]}-${parts[3]}` === pathDateStr;
	}

	const d = new Date(str);
	if (Number.isNaN(d.getTime())) return false;

	// JS parses non-ISO date strings in local time, so we use local components
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}` === pathDateStr;
};

const blog = defineCollection({
	loader: glob({
		base: './src/content/blog',
		pattern: '**/*.{md,mdx}',
		generateId: ({ entry, data }) => {
			const match = entry.match(/^([^/]+)\/(\d{4}-\d{2}-\d{2})-([^/]+)\.(md|mdx)$/);
			if (!match) {
				throw new Error(
					`Invalid file path or format: "src/content/blog/${entry}".\n` +
					`Expected structure: "src/content/blog/[category]/[YYYY]-[MM]-[DD]-[filename].{md,mdx}"`
				);
			}

			const [, pathCategory, pathDateStr] = match;

			if (data.category && data.category !== pathCategory) {
				throw new Error(
					`Category mismatch in "src/content/blog/${entry}".\n` +
					`Frontmatter category is "${data.category}", but directory is "${pathCategory}".`
				);
			}

			if (data.pubDate && !dateMatches(data.pubDate, pathDateStr)) {
				throw new Error(
					`Publication date mismatch in "src/content/blog/${entry}".\n` +
					`Frontmatter pubDate is "${data.pubDate}", but file prefix is "${pathDateStr}".`
				);
			}

			return entry.replace(/\.(md|mdx)$/, '');
		}
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			category: z.enum(BLOG_CATEGORY_IDS),
		}),
});

export const collections = { blog };
