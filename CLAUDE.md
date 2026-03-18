# Imbra Website — Claude Code Instructions

## Project
Website for Imbra (imbra.io) — a boutique software and industrial engineering consultancy based in Varna, Bulgaria.

- Owner: Branimir Georgiev
- GitHub org: https://github.com/Imbra-Ltd
- Contact: contact@imbra.io
- LinkedIn: https://linkedin.com/in/branimir-georgiev
- Deployed to GitHub Pages at https://imbra.io via GitHub Actions on push to `main`

## Stack
- Astro (static site generator, output: static / GitHub Pages)
- TypeScript for interactive React island components
- Plain CSS in `src/styles/global.css` (no Tailwind, no CSS-in-JS)
- Content driven by JSON files in `src/data/`
- Deployed via GitHub Actions on push to `main`

## Design
- Aesthetic: Swiss precision, clean, minimal, clinical
- Background: `#FFFFFF` and `#F8F9FA` alternating sections
- Accent: steel blue `#1B4F8A`
- Typography: IBM Plex Sans (300, 400, 500, 600) + IBM Plex Mono (400, 500) loaded from Google Fonts
- All CSS lives in `src/styles/global.css` — do not use inline styles except for dynamic/computed values
- Responsive breakpoints:
  - Tablet: max-width 1024px
  - Mobile: max-width 768px (hamburger menu replaces nav links)
  - Small mobile: max-width 480px

## Brand voice
- Tagline: "Complex inside. Simple outside."
- Tone: precise, direct, no marketing fluff, no adjective inflation
- Use "Imbra" in body copy — not "Imbra Ltd", not "IMBRA.SOFT"
- Footer text logo renders as: `IMBRA` in IBM Plex Mono
- Nav logo is an SVG image (`/logos/logo-1b-web.svg`)

## Content
All editable content lives in `src/data/` as JSON. Never hardcode content that a non-developer might want to change. Non-developers edit only `src/data/` — no JS/TS knowledge required.

| File                         | Controls                                       |
|------------------------------|------------------------------------------------|
| `src/data/site.json`         | Nav links, hero stats, contact section (incl. Formspree endpoint), footer |
| `src/data/products.json`     | Portfolio cards and detail panels              |
| `src/data/services.json`     | Services accordion items                       |
| `src/data/expertise.json`    | Domain expertise cards                         |
| `src/data/publications.json` | Research publications with DOI links           |
| `src/data/process.json`      | How We Work section steps                      |
| `src/data/pricing.json`      | Pricing page — all engagement models           |

Note: `src/content/` is intentionally avoided — Astro reserves that path for Content Collections.

## Component architecture

```
src/components/
├── interactive/          # React islands — only components that need JS
│   ├── HamburgerMenu.tsx # Mobile nav toggle
│   ├── ProductExpand.tsx # Portfolio card expand/collapse
│   ├── ServiceExpand.tsx # Services accordion
│   └── ContactForm.tsx   # Contact form — POST to Formspree endpoint
├── Nav.astro             # Static nav shell — mounts HamburgerMenu island
├── Hero.astro
├── Portfolio.astro       # Static section header — mounts ProductExpand island
├── Services.astro        # Static section header — mounts ServiceExpand island
├── Expertise.astro
├── Publications.astro
├── Contact.astro         # Dark CTA section — email link + ContactForm island
└── Footer.astro
```

**Rule:** default to `.astro`. Only reach for React (`.tsx`) when client-side state is required.

## Pages

| Page                            | Path                                | Notes                                      |
|---------------------------------|-------------------------------------|--------------------------------------------|
| Homepage                        | `/`                                 | All main sections                          |
| Pricing                         | `/pricing/`                         | Standalone page with contact form          |
| Whitepaper — ImBrain            | `/whitepapers/imbrain/`             | Landing page for ImBrain white paper       |
| Whitepaper — Imbra Connect      | `/whitepapers/imbra-connect/`       | Landing page for Imbra Connect white paper |
| Whitepaper — Honeywell/Siemens  | `/whitepapers/honeywell-siemens/`   | Landing page for Honeywell white paper     |
| Privacy Policy                  | `/privacy/`                         | Legal page                                 |
| Imprint                         | `/imprint/`                         | Legal page                                 |
| 404                             | `/404`                              | Branded not-found page                     |

Whitepaper PDFs are stored in `public/docs/` and served at `/docs/*.pdf`. PDFs are committed to git and deployed with the site. To regenerate a PDF after editing its source markdown:
```
pandoc docs/WHITEPAPER-<NAME>.md -o public/docs/<name>.pdf --pdf-engine="C:/Program Files/wkhtmltopdf/bin/wkhtmltopdf.exe" --metadata title="<Title>"
```

## Homepage sections (in order)
1. Nav — logo (links to `/`), section links, hamburger on mobile
2. Hero — eyebrow, headline, sub-text, CTA buttons, stat strip (4 cards)
3. Portfolio — 3 product cards in a grid (count-driven, no hardcoded columns), expandable with detail panel
4. Services — 10 service cards in 2-column grid, each expandable inline
5. Expertise — 4 domain expertise cards
6. Research & Credentials — 3 publication cards with DOI links
7. Contact CTA — dark (`#111318`) section with headline, email link, and contact form
8. Footer — top bar (legal links + social icons), body (address + about), bottom bar (copyright)

## Reveal animations
`.reveal` → `.reveal.visible` transition handled by a single `IntersectionObserver` script in `src/layouts/Base.astro`. Do not add per-component reveal scripts.

## Third-party services

| Service | Purpose | Config |
|---------|---------|--------|
| [Formspree](https://formspree.io) | Contact form → `contact@imbra.io` | `src/data/site.json` → `contact.formEndpoint` |
| [Plausible](https://plausible.io) | Privacy-friendly analytics (no cookies) | Script tag in `src/layouts/Base.astro` |
| [Google Search Console](https://search.google.com/search-console) | Search indexing and crawl monitoring | Verification meta tag in `src/layouts/Base.astro` |

## Advice rule

When giving an opinion or recommendation, always state the lens explicitly — e.g. "From a maintenance perspective…" or "From a marketing perspective…". If the answer differs by lens, state all relevant lenses and their conclusions before giving a final recommendation. Never give a flat answer to a multi-lens question without acknowledging the tension.

## Quality attributes

Non-negotiable standards for this project:

**Content & architecture**
- All editable content lives in `src/data/` as JSON — never hardcoded in components
- Default to `.astro`; only use React (`.tsx`) when client-side state is required
- No dead code — remove unused components, CSS rules, and data files promptly

**CSS**
- All CSS in `src/styles/global.css` — no inline styles except dynamic/computed values
- No hardcoded colour or spacing values — always use CSS custom properties from `:root`
- Consistent naming: component-element (e.g. `.product-card`, `.footer-logo`)

**Accessibility**
- Semantic HTML: correct landmark elements and heading hierarchy
- `aria-label` on all interactive elements (buttons, icon links)
- Keyboard navigation: menus must close on Escape and restore focus

**Performance**
- Preload critical above-the-fold assets
- Keep client-side JS minimal — static (Astro SSG) by default

**SEO & analytics**
- `robots.txt`, Open Graph, and Twitter Card meta tags required
- Privacy-friendly analytics only (no consent banner required)

**Documentation**
- `CLAUDE.md` and `README.md` must always reflect the actual codebase
- No references to non-existent files, components, or services

## Documentation rule
Before every commit, update all relevant documentation:
- **`CLAUDE.md`** — update if component architecture, stack, design rules, or conventions change
- **`README.md`** — update if project structure, stack, or onboarding steps change
- **`docs/PLAYBOOK.md`** — update if commands, git workflow, third-party services, or release process change

## Git conventions
- Always work on a branch — never commit directly to `main`
- Exception: documentation-only changes (`docs/`, `README.md`, `CLAUDE.md`) may go directly to `main`
- Branch naming: `feature/description` or `fix/description`
- PRs should be small and focused — one concern per PR
- Always test with `npm run dev` before committing
- Do not commit `dist/` or `node_modules/`
- **Before pushing or creating a PR**, always check the current branch and open PR status with `git status` and `gh pr list`. If the previous PR is closed or merged, create a new branch rather than pushing to a stale one.
- **After a PR is merged**, delete both the remote and local branch: `git branch -d <branch>` and `gh api -X DELETE repos/Imbra-Ltd/imbra-io.github.io/git/refs/heads/<branch>`. Then pull main: `git checkout main && git pull`.

## Commands
```
npm run dev      # develop — hot reload at localhost:4321
npm run build    # compile — production build to dist/
npm run preview  # verify — preview the production build locally
```