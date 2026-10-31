/**
 * 文案里的极小 Markdown：段落（空行隔开）、「- 」列表、`行内代码`、[链接](地址)。
 * 只给练习说明这类短文用，长文用 .md 文件由 Astro 渲染。输出已转义，可以直接 set:html。
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s: string): string {
  const code = (x: string) => x.replace(/`([^`]+)`/g, '<code>$1</code>');
  return code(esc(s)).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function renderMiniMd(md: string): string {
  return md
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => l.startsWith('- '))) return '<ul>' + lines.map((l) => '<li>' + inline(l.slice(2)) + '</li>').join('') + '</ul>';
      return '<p>' + inline(lines.join(' ')) + '</p>';
    })
    .join('\n');
}
