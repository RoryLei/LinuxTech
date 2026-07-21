# LinuxTech Learning Platform — Design Document

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  index.html ──▶ style.css                       │
│      │                                           │
│      ├──▶ topics.js  (Data layer: TOPICS[])     │
│      │                                           │
│      └──▶ app.js     (Logic: router + renderer) │
│                                                  │
│  URL Hash (#id) ◀──▶ Router ──▶ Renderer        │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Nginx (port 8080)      │
│  /var/www/linuxtech/    │
└─────────────────────────┘
```

## Component Design

### Data Layer — topics.js
- Exports global `const TOPICS` array
- Each Topic object structure:
  ```typescript
  interface Topic {
    id: string;          // kebab-case, used as URL hash
    icon: string;        // emoji
    title: string;       // topic title
    description: string; // short description
    sections: Section[];
  }

  interface Section {
    title: string;       // section heading
    content: string;     // HTML string
  }
  ```

### Logic Layer — app.js
- **IIFE encapsulation** to avoid global pollution
- **router()** — listens to `hashchange`, parses hash to show homepage or topic page
- **buildTopicGridHTML()** — renders TOPICS as card grid with current view mode
- **buildTopicPageHTML(topic)** — renders a single topic as a detail learning page
- **onViewChange()** — handles view mode switching, persists to localStorage
- **VIEW_MODES** — defines 5 layout options (large, medium, small, list, details)

### Style Layer — style.css
- CSS Custom Properties for color theming
- Grid layout with adaptive columns per view mode
- Dark theme as default with high contrast for accessibility

## Routing

| URL | Behavior |
|-----|----------|
| `/#` or `/` | Show topic card grid |
| `/#filesystem` | Show filesystem topic content |
| `/#ebpf` | Show eBPF topic content |
| `/#invalid-id` | Fallback to homepage grid |

## Deployment Architecture

- **deploy.sh** detects distro → installs Nginx → copies files → writes vhost → starts service
- Supports Debian/Ubuntu (apt), RHEL/Fedora (dnf/yum), Arch (pacman)
- Uses port 8080 when port 80 is occupied

## Adding a New Topic

1. Append a new object to the TOPICS array in `topics.js`
2. No changes to `index.html` or `app.js` needed
3. Redeploy (`sudo bash deploy.sh`) to go live
