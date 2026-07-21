---
inclusion: auto
---

# Coding Standards

## Language Policy
- **All content must be written in English** — source code, comments, UI text, documentation, commit messages, and markdown files.
- Technical terms use standard English naming (e.g., eBPF, Docker, Nginx).

## JavaScript
- Use `const` / `let`, no `var`
- Strings use single quotes; template strings use backticks
- IIFE to encapsulate application logic, avoid global pollution
- No frontend frameworks or build tools

## CSS
- Use CSS Custom Properties (variables) for theme colors
- BEM-like naming: `.block__element`, `.block--modifier`
- Mobile-first responsive design
- Dark theme as default

## Accessibility & Low-Vision Color Guidelines
Users may have low vision. All color choices must follow these principles:
- **Contrast**: Text-to-background contrast must meet WCAG 2.1 AA (normal text >= 4.5:1, large text >= 3:1)
- **Never rely on color alone**: All states, errors, and interactive hints must include icons, underlines, or text — not just color differences
- **Accent colors must be bright and saturated**: Accent vs dark background should have >= 7:1 contrast
- **Font size**: Base font no smaller than 16px; headings and button text >= 18px recommended
- **Interactive elements**: hover/focus states must include border, outline, or scale changes — not just color
- **Links**: Must have underline or clear visual distinction beyond color
- **Code blocks**: Code text vs background contrast >= 4.5:1; avoid low-contrast light gray
- **High contrast mode**: CSS variable design should support future high-contrast theme toggle

## HTML
- Set `lang="en"`
- Semantic tags (header, main, footer, section, article)
- All interactive elements must have aria-label or clear visible text

## Topic Data Format (topics.js)
Each topic object must include:
```javascript
{
  id: 'kebab-case-id',       // used in URL hash
  icon: '📦',                // single emoji
  title: 'Topic Title',
  description: 'One-line description of the topic',
  sections: [
    {
      title: 'Section Title',
      content: `<p>HTML content</p>`  // supports HTML tags
    }
  ]
}
```

## Content Writing Guidelines
- All content in English
- Code examples wrapped in `<pre><code>`
- Sections ordered from introductory to advanced
- Include links to official documentation where applicable
