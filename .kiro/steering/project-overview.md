---
inclusion: auto
---

# LinuxTech Project Overview

## Description
LinuxTech is a static website learning platform that presents Linux technology topics as block cards, allowing users to select a topic and dive into learning.

## Tech Stack
- Pure frontend: HTML5 + CSS3 + Vanilla JavaScript (no frameworks)
- Deployment: Nginx static file server
- Routing: Hash-based SPA routing (`#topic-id`)

## Project Structure
```
LinuxTech/
├── index.html          # Main page (single HTML entry point)
├── css/
│   └── style.css       # Site-wide styles (dark theme)
├── js/
│   ├── topics.js       # Topic data (TOPICS array)
│   └── app.js          # Routing, view switching, and rendering logic
├── tools/              # eBPF monitoring tools
│   └── pcie-aer-monitor/
├── deploy.sh           # One-click deployment script (Nginx)
└── .kiro/              # Kiro IDE configuration
```

## Architecture Pattern
- `topics.js` defines `const TOPICS = [...]` array; each object contains `id`, `icon`, `title`, `description`, `sections`
- `app.js` reads TOPICS, renders cards with a view mode selector, and uses hash routing for topic detail pages
- Adding a new topic only requires appending an object to the TOPICS array — no changes to other files needed

## View Modes
The site supports 5 view modes (persisted in localStorage):
- Large Icons, Medium Icons, Small Icons, List, Details
