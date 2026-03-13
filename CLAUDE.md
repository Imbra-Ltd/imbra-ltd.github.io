# Imbra.Soft Website — Claude Code Instructions

## Project
Website for Imbra.Soft (imbra-soft.com) — a boutique software and industrial engineering consultancy based in Varna, Bulgaria.

- Owner: Branimir Georgiev
- GitHub org: https://github.com/Imbra-Ltd
- Contact: contact@imbra-soft.com
- LinkedIn: https://linkedin.com/in/branimir-georgiev
- Deployed to GitHub Pages at https://imbra-ltd.github.io via GitHub Actions on push to `main`

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
- Use "Imbra.Soft" in body copy — not "Imbra Ltd", not "IMBRA.SOFT"
- Logo renders as: `IMBRA<span>.</span>SOFT` in IBM Plex Mono

## Content
All editable content lives in `src/data/` as JSON. Never hardcode content that a non-developer might want to change. Non-developers edit only `src/data/` — no JS/TS knowledge required.

| File                         | Controls                                       |
|------------------------------|------------------------------------------------|
| `src/data/site.json`         | Nav links, hero stats, contact section, footer |
| `src/data/products.json`     | Portfolio cards and detail panels              |
| `src/data/services.json`     | Services accordion items                       |
| `src/data/expertise.json`    | Domain expertise cards                         |
| `src/data/publications.json` | Research publications with DOI links           |

Note: `src/content/` is intentionally avoided — Astro reserves that path for Content Collections.

## Component architecture

```
src/components/
├── interactive/          # React islands — only components that need JS
│   ├── HamburgerMenu.tsx # Mobile nav toggle
│   ├── ProductExpand.tsx # Portfolio card expand/collapse
│   └── ServiceExpand.tsx # Services accordion
├── Nav.astro             # Static nav shell — mounts HamburgerMenu island
├── Hero.astro
├── Portfolio.astro       # Static section header — mounts ProductExpand island
├── Services.astro        # Static section header — mounts ServiceExpand island
├── Expertise.astro
├── Publications.astro
├── Contact.astro
└── Footer.astro
```

**Rule:** default to `.astro`. Only reach for React (`.tsx`) when client-side state is required.

## Page sections (in order)
1. Nav — logo (links to `/`), section links, hamburger on mobile
2. Hero — eyebrow, headline, sub-text, CTA buttons, stat strip (4 cards)
3. Portfolio — 3 product cards in a grid, expandable with detail panel
4. Services — 10 service cards in 2-column grid, each expandable inline
5. Expertise — 4 domain expertise cards
6. Research & Credentials — 3 publication cards with DOI links
7. Contact CTA — dark (`#111318`) section with headline and email
8. Footer — top bar (legal links + social icons), body (address + about), bottom bar (copyright)

## Reveal animations
`.reveal` → `.reveal.visible` transition handled by a single `IntersectionObserver` script in `src/layouts/Base.astro`. Do not add per-component reveal scripts.

## Git conventions
- Always work on a branch — never commit directly to `main`
- Branch naming: `feature/description` or `fix/description`
- PRs should be small and focused — one concern per PR
- Always test with `npm run dev` before committing
- Do not commit `dist/` or `node_modules/`

## Commands
```
npm run dev      # develop — hot reload at localhost:4321
npm run build    # compile — production build to dist/
npm run preview  # verify — preview the production build locally
```