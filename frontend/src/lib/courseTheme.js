// A course keeps its colour when searching, sorting or moving between pages.
export function courseTheme(course) {
  const hue = ((Number(course?.id || 1) - 1) * 137.508 + 215) % 360;
  return {
    '--course-accent': `hsl(${hue} 65% 26%)`,
    '--course-tint': `hsl(${hue} 75% 90%)`,
    '--course-surface': `hsl(${hue} 75% 97%)`,
    '--course-border': `hsl(${hue} 50% 74%)`,
    '--art-bg': `hsl(${hue} 75% 90%)`,
  };
}
