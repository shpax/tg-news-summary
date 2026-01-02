import { StructuredSummary, Category, TelegraphNode, TelegraphArticle } from '../types';
import { DateTime } from 'luxon';

/**
 * Renders a StructuredSummary as a Telegraph article
 */
export function renderTelegraphArticle(
  structuredSummary: StructuredSummary,
  categories: Category[],
  authorName: string
): TelegraphArticle {
  // Generate title with Ukrainian date
  const date = DateTime.now().setLocale('uk').toFormat('d MMMM yyyy');
  const title = `Новини за ${date}`;

  // Convert summary and categories to Telegraph nodes
  const content = structuredSummaryToNodes(structuredSummary, categories);

  return {
    title,
    authorName,
    content,
  };
}

/**
 * Converts StructuredSummary to Telegraph node format
 */
function structuredSummaryToNodes(
  structuredSummary: StructuredSummary,
  categories: Category[]
): TelegraphNode[] {
  const nodes: TelegraphNode[] = [];

  // Create category icon map
  const categoryIcons = categories.reduce<Record<string, string>>((map, cat) => {
    map[cat.id] = cat.icon;
    return map;
  }, {});

  // Add summary paragraphs
  const summaryParagraphs = structuredSummary.summary.split('\n\n');
  for (const paragraph of summaryParagraphs) {
    if (paragraph.trim()) {
      nodes.push(createParagraphNode(paragraph.trim()));
    }
  }

  // Add each category section
  for (const category of structuredSummary.categories) {
    if (category.content) {
      const icon = categoryIcons[category.categoryId] || '📍';

      // Add category heading with emoji
      nodes.push({
        tag: 'h3',
        children: [`${icon} ${category.title}`],
      });

      // Split content into paragraphs and process
      const categoryParagraphs = category.content.split('\n\n');
      for (const paragraph of categoryParagraphs) {
        if (paragraph.trim()) {
          nodes.push(createParagraphNode(paragraph.trim()));
        }
      }
    }
  }

  return nodes;
}

/**
 * Creates a Telegraph paragraph node, handling line breaks
 */
function createParagraphNode(text: string): TelegraphNode {
  const lines = text.split('\n');

  if (lines.length === 1) {
    // Single line paragraph
    return {
      tag: 'p',
      children: [text],
    };
  }

  // Multiple lines - insert <br> tags between them
  const children: (string | TelegraphNode)[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      children.push({ tag: 'br' });
    }
    children.push(lines[i]);
  }

  return {
    tag: 'p',
    children,
  };
}
