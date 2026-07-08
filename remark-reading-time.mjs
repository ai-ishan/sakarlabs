import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    // e.g. "3 min read" — surfaced via remarkPluginFrontmatter.minutesRead
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}
