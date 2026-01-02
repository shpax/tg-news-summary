import Handlebars from 'handlebars';
import { StructuredSummary, Category } from '../types';
import { DateTime } from 'luxon';

export function renderTelegramPost(
  structuredSummary: StructuredSummary,
  template: string,
  categories: Category[]
): string {
  const compiled = Handlebars.compile(template);

  // Create icon map from categories
  const categoryIcons = categories.reduce<Record<string, string>>(
    (map, cat) => {
      map[cat.id] = cat.icon;
      return map;
    },
    {}
  );

  // Add icons to categories
  const categoriesWithIcons = structuredSummary.categories.map((cat) => ({
    ...cat,
    icon: categoryIcons[cat.categoryId] || '📍',
  }));

  // Generate date in Ukrainian format
  const date = DateTime.now().setLocale('uk').toFormat('d MMMM yyyy');

  return compiled({
    summary: structuredSummary.summary,
    categories: categoriesWithIcons,
    date,
  });
}

/**
 * Renders a short Telegram post with a link to the Telegraph article
 */
export function renderTelegramPostWithLink(
  summary: string,
  telegraphUrl: string
): string {
  const date = DateTime.now().setLocale('uk').toFormat('d MMMM yyyy');

  return `📰 *Новини за ${date}*

${summary}

📖 [Що ще сталося сьогодні? Читати повний огляд](${telegraphUrl})
`;
}
