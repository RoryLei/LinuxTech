# Skill: Add Learning Topic

## Description
Add a new Linux technology learning topic to the LinuxTech platform.

## Trigger
User requests adding a new learning topic to the platform.

## Steps

1. **Research resources** — Search for official documentation and tutorials; understand core concepts and learning path
2. **Plan structure** — Design 5-7 sections from introductory to advanced (Concept → Theory → Setup → Basics → Advanced → Real-world)
3. **Edit topics.js** — Append a new topic object to the `TOPICS` array in `js/topics.js`
4. **Verify syntax** — Run `node --check js/topics.js` to ensure no syntax errors
5. **Verify loading** — Use Node.js to confirm the new topic's id and section count
6. **Deploy update** — If already deployed, run `sudo bash deploy.sh` to update the live site

## Topic Object Template
```javascript
{
  id: 'topic-id',           // must be kebab-case
  icon: '🔬',              // single emoji representing the topic
  title: 'Topic Title',
  description: 'One-line description of what this topic covers',
  sections: [
    {
      title: '1. Section Title',
      content: `
        <p>Explanation text</p>
        <pre><code>Code example</code></pre>
      `
    }
    // ... more sections
  ]
}
```

## Content Guidelines
- All content in English
- Sections ordered from introductory to advanced
- Include executable code examples
- Code wrapped in `<pre><code>`
- Provide official reference links (using `<a href="..." target="_blank">`)
