# Lessgo Website Swarm 🐝

A set of **persona prompts** you can call in VS Code Chat to run a
cross-functional discussion and produce guidelines for a **brand-new Lessgo
marketing website**.

Each persona lives in its own `.prompt.md` file. Call one on its own, or convene
them all with the **facilitator**.

## How to use

**Run the whole roundtable (recommended):**
1. Open VS Code Chat.
2. Run the facilitator: type `/website-roundtable` (or *Chat: Run Prompt…* →
   `website-roundtable`).
3. Describe the goal, e.g. *"Propose the site structure and homepage for the new
   lessgo.com."*
4. The facilitator convenes every persona, has each weigh in, resolves conflicts,
   and synthesizes a single website brief + guidelines.

**Call one specialist:**
- Run `/product-manager`, `/ux-designer`, `/legal-privacy-advisor`, etc. to go
  deep on a single perspective.

> If a persona doesn't appear as a `/` slash command in your VS Code version
> (nested prompt folders vary), use **Chat: Run Prompt…** and pick the file, or
> open the `.prompt.md` file and press the ▶ play button.

## The swarm

| Prompt | Role | Owns the question of… |
|---|---|---|
| `/website-roundtable` | 🎯 Facilitator | Convening the swarm & synthesizing the brief |
| `/product-manager` | 📋 Product Manager | Why the site exists, scope, priorities, success metrics |
| `/brand-strategist` | ✨ Brand Strategist | Positioning, voice, identity, differentiation |
| `/content-copywriter` | ✍️ Content Strategist & Copywriter | Messaging architecture & page copy |
| `/ux-designer` | 🎨 UX/UI Designer | Flows, wireframes, layout, design system |
| `/seo-specialist` | 🔍 SEO Specialist | Discoverability & technical SEO |
| `/growth-marketer` | 🚀 Growth Marketer | Acquisition, funnels, referral, installs |
| `/cro-specialist` | 📈 CRO Specialist | Conversion optimization & A/B testing |
| `/legal-privacy-advisor` | ⚖️ Legal & Privacy Advisor | Compliance, privacy, consent, disclaimers |
| `/accessibility-specialist` | ♿ Accessibility Specialist | WCAG, inclusive design |
| `/frontend-web-engineer` | 🛠️ Frontend Web Engineer | Feasibility, performance, implementation |
| `/analytics-measurement` | 📊 Analytics & Measurement | How we know the site works |

## Shared context
Every persona reads [`_context-lessgo.md`](./_context-lessgo.md) — the product &
brand facts. **Keep it up to date**; it's the single source of truth the swarm
grounds itself in.

## Notes
- These are **prompt files** (single-invocation personas). If you later want true
  parallel sub-agents, each persona body can be promoted to a `.agent.md` custom
  agent with almost no changes.
- Legal/privacy output is **guidance, not legal advice** — have counsel review
  anything compliance-related before you ship.
