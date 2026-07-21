# Skill: Content Review & Improvement

## Description
Review existing topic content for correctness, completeness, and readability, then suggest or apply improvements.

## Trigger
User requests checking or improving a topic's content.

## Steps

1. **Read topic data** — Open `js/topics.js` and locate the target topic
2. **Review checklist**:
   - Is the technical information accurate and up-to-date?
   - Are code examples executable?
   - Are sections ordered from introductory to advanced?
   - Are there enough real-world examples?
   - Are HTML tags properly closed?
3. **Search for latest info** — Use web search to verify tool versions and syntax
4. **Modify content** — Update the corresponding sections in `topics.js`
5. **Verify** — `node --check js/topics.js`

## Quality Standards
- Each topic should have at least 5 sections
- Each section includes explanatory text + executable code
- Commands include brief comments
- Official documentation links provided
- All content in English
