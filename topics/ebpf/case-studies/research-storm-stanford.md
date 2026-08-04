# Research Report: Stanford STORM — LLM-Powered Knowledge Curation System

**Status:** PENDING REVIEW (not yet added as a topic)
**Repository:** https://github.com/stanford-oval/storm
**Lab:** Stanford OVAL (Open Virtual Assistant Lab)
**Papers:** NAACL 2024 (STORM), EMNLP 2024 (Co-STORM)

---

## Executive Summary

STORM (Synthesis of Topic Outlines through Retrieval and Multi-perspective
Question Asking) is an open-source LLM-powered system that automatically
researches a topic and generates a full-length, cited article (Wikipedia-style).
It models the human pre-writing process: research → organize → write → polish.

Co-STORM extends this into a human-AI collaborative mode where users can
participate in the research discourse in real-time.

---

## What STORM Does

### Core Capability
Given a topic (e.g., "PCIe Advanced Error Reporting"), STORM:
1. Discovers diverse perspectives on the topic
2. Simulates multi-perspective research conversations
3. Collects and organizes information from internet sources
4. Generates a hierarchical outline
5. Writes a full article with inline citations
6. Polishes the final output

### Two Modes

| Mode | Description | Interaction |
|------|-------------|-------------|
| **STORM** | Fully autonomous article generation | User provides topic → system outputs article |
| **Co-STORM** | Human-AI collaborative knowledge curation | User participates in research discourse, steers focus |

---

## How It Works (Architecture)

### STORM Pipeline (4 Modules)

```
Input: "Topic"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ Module 1: Knowledge Curation                                     │
│                                                                   │
│   1. Discover perspectives (survey similar articles)             │
│   2. For each perspective:                                        │
│      - Simulate conversation: Writer ↔ Expert (grounded in web) │
│      - Writer asks questions from that perspective                │
│      - Expert answers with citations from search results         │
│   3. Collect all Q&A pairs + sources                             │
│                                                                   │
│   Key Innovation: Multi-perspective question asking              │
│   (not just "ask LLM to generate questions" but simulate         │
│    different viewpoints to get breadth + depth)                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Module 2: Outline Generation                                     │
│                                                                   │
│   - Organize curated info into hierarchical structure            │
│   - Generates section headings + subheadings                     │
│   - Maps collected information to relevant sections              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Module 3: Article Generation                                     │
│                                                                   │
│   - For each section: generate text grounded on collected refs   │
│   - Inline citations ([1], [2], etc.)                            │
│   - Uses outline as structure guide                              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Module 4: Article Polishing                                      │
│                                                                   │
│   - Add introduction/summary section                             │
│   - Remove duplicate content across sections                     │
│   - Improve readability and flow                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
Output: Full article with citations + references list
```

### Co-STORM Additional Components

```
┌─────────────────────────────────────────────────────────┐
│ Collaborative Discourse Protocol                         │
│                                                           │
│  Turn Management Policy:                                 │
│    - LLM Expert agents (answer + follow-up questions)   │
│    - Moderator agent (thought-provoking questions)      │
│    - Human user (observe or inject utterance)           │
│                                                           │
│  Dynamic Mind Map:                                       │
│    - Hierarchical concept structure                      │
│    - Updated as discourse progresses                    │
│    - Shared conceptual space (reduces mental load)      │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Stack

| Component | Implementation |
|-----------|---------------|
| Framework | DSPy (declarative LLM pipeline) |
| Language Models | Any via litellm (GPT-4o, Claude, local models) |
| Embedding Models | Any via litellm |
| Search/Retrieval | You.com, Bing, Google, Tavily, Brave, SearXNG, DuckDuckGo, VectorRM (local docs) |
| Package | `pip install knowledge-storm` |
| Python | 3.11+ |
| UI | Streamlit (demo_light) |

---

## Key Innovations (Why This Is Interesting)

### 1. Multi-Perspective Question Asking
Instead of directly prompting an LLM to "write about X," STORM first discovers
what perspectives exist (like different Wikipedia editors would approach the topic
differently) and uses each perspective to generate targeted research questions.

### 2. Simulated Expert Conversations
The system simulates a conversation between a "writer" and a "topic expert" where
the expert's answers are grounded in real internet search results. This produces
naturally structured, citation-backed information.

### 3. Grounded Generation (Not Hallucination)
Every claim in the output is backed by a retrieved source. The system doesn't
generate from parametric knowledge alone — it always retrieves first.

### 4. Human-in-the-Loop (Co-STORM)
Unlike fully autonomous systems, Co-STORM lets humans steer the research:
- Observe AI discourse → gain understanding without effort
- Inject utterances → redirect focus to areas of interest
- Dynamic mind map → shared understanding of what's been discovered

### 5. Modular & Customizable
Each module (curation, outline, generation, polish) has a defined interface and
can be replaced independently. Supports any LLM via litellm.

---

## Relevance to LinuxTech Project

### Potential Use Cases

| Use Case | How STORM Could Help |
|----------|---------------------|
| Auto-generate new topic drafts | Given "NVMe" as input, STORM researches and produces a structured article |
| Research reports (like our eBPF study) | Use Co-STORM to collaboratively research a new technology |
| Keep content current | Re-run STORM periodically to update articles with new information |
| Multi-perspective coverage | Ensures topics cover admin, developer, and hardware perspectives |
| Citation quality | Every claim is backed by a URL (verifiable) |

### Potential Integration Points

```
LinuxTech Workflow:
                                              ┌──────────────────┐
  User: "Add topic about CXL memory"  ──────▶│  STORM Runner    │
                                              │  (research +     │
                                              │   generate)      │
                                              └────────┬─────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │ Draft Article    │
                                              │ (with citations) │
                                              └────────┬─────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │ Human Review     │
                                              │ (edit, approve)  │
                                              └────────┬─────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │ Convert to       │
                                              │ topics/<id>/     │
                                              │ index.js format  │
                                              └──────────────────┘
```

---

## Limitations & Considerations

| Concern | Detail |
|---------|--------|
| **Quality** | Output is draft-quality, not publication-ready (Wikipedia editors confirmed) |
| **Cost** | Requires many LLM API calls (GPT-4o); one article ≈ $1-5 in API costs |
| **Accuracy** | Grounded in search results but search results themselves may be inaccurate |
| **Depth** | Breadth is good (multi-perspective), but deep technical content may be superficial |
| **Latency** | Full pipeline takes minutes (not real-time) due to multiple search + LLM calls |
| **Local knowledge** | VectorRM supports local docs but quality depends on corpus |
| **License** | MIT License (permissive, OK for our project) |
| **Maintenance** | Active development (Stanford lab), regular updates |

---

## Evaluation Results (From Papers)

### STORM (NAACL 2024)
- Evaluated on FreshWiki dataset (100 Wikipedia articles, 2022-2023)
- Human evaluation by experienced Wikipedia editors
- Found helpful for **pre-writing stage** (research & outline)
- Full articles require significant editing for publication

### Co-STORM (EMNLP 2024)
- Human evaluation showed improved topic understanding
- Mind map reduced cognitive load in long discussions
- Users preferred collaborative mode for complex/unfamiliar topics

---

## Setup & Quick Test

```bash
# Install
pip install knowledge-storm

# Configure (secrets.toml)
OPENAI_API_KEY="sk-..."
BING_SEARCH_API_KEY="..."

# Run STORM
python examples/storm_examples/run_storm_wiki_gpt.py \
    --output-dir ./output \
    --retriever bing \
    --do-research \
    --do-generate-outline \
    --do-generate-article \
    --do-polish-article

# Run Co-STORM (interactive)
python examples/costorm_examples/run_costorm_gpt.py \
    --output-dir ./output \
    --retriever bing
```

---

## Recommendation

### Should We Add STORM as a LinuxTech Topic?

**Pros:**
- Directly relevant to AI/LLM knowledge work
- Could be used as a tool to accelerate LinuxTech content creation
- Well-documented, actively maintained, Stanford-backed
- MIT licensed, easy to integrate

**Cons:**
- Not a "Linux technology" per se (it's an AI tool)
- Requires API keys ($) to use
- May not fit the hardware/kernel focus of existing topics

### Suggested Topic Scope (If Approved)
1. What is STORM (overview, architecture)
2. Installation & configuration
3. Running STORM for technical research
4. Co-STORM collaborative mode
5. VectorRM (grounding on local documents)
6. Customizing the pipeline (modules, LMs, retrievers)
7. Integration with documentation workflows

---

## References

- [STORM Paper (NAACL 2024)](https://arxiv.org/abs/2402.14207)
- [Co-STORM Paper (EMNLP 2024)](https://aclanthology.org/2024.emnlp-main.554/)
- [GitHub Repository](https://github.com/stanford-oval/storm)
- [Stanford OVAL Lab](https://oval.cs.stanford.edu/)
- [Live Research Preview](https://storm.genie.stanford.edu/)
- [PyPI: knowledge-storm](https://pypi.org/project/knowledge-storm/)
