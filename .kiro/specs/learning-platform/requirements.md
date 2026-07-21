# LinuxTech Learning Platform — Requirements

## Project Goal
Build a block-card based Linux technology learning platform where users can select topics to learn.

## Functional Requirements

### FR-1: Topic Card Display
- Homepage displays all available learning topics in a grid layout
- Each card shows: emoji icon, topic title, short description
- Cards have hover/focus interactive effects
- Responsive design: single column on mobile

### FR-2: Topic Detail Page
- Clicking a card navigates to the topic's learning content
- Content divided into multiple sections, ordered from introductory to advanced
- Supports HTML-formatted content (paragraphs, lists, code blocks, tables, links)
- Provides a "Back to topics" button

### FR-3: Hash Routing
- Uses URL hash (`#topic-id`) for client-side routing
- Supports browser back/forward navigation
- Direct access to `http://host/#topic-id` lands on the correct topic

### FR-4: Data-Driven Architecture
- Topic data centralized in `topics.js`
- Adding a new topic only requires appending to the TOPICS array — no HTML or JS logic changes needed

### FR-5: View Mode Switching
- Dropdown selector for layout modes: Large Icons, Medium Icons, Small Icons, List, Details
- User selection persisted in localStorage

### FR-6: One-Click Deployment
- `deploy.sh` script supports multiple Linux distributions
- Automatically installs Nginx, copies files, configures virtual host, starts service

## Non-Functional Requirements

### NFR-1: Performance
- Pure static site, no backend dependencies
- Static assets cached for 7 days in browser
- First load < 500KB

### NFR-2: Accessibility
- Cards have aria-label attributes
- Keyboard navigable (Tab for focus, Enter to select)
- Color contrast meets WCAG AA standards
- Focus states include visible outline (not just color change)
- Links are underlined for non-color identification

### NFR-3: Security
- Nginx config includes security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- Hidden files (`.git`, etc.) access denied

### NFR-4: Compatibility
- Supports modern browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- No polyfills or transpiling required
