# Imbra.soft Website — Claude Code Instructions

## Project
Website for Imbra.soft (imbra.co) — a boutique software and industrial engineering consultancy based in Varna, Bulgaria.
Deployed to GitHub Pages at https://imbra-ltd.github.io via GitHub Actions on push to `main`.

## Stack
- Astro (static site generator)
- TypeScript for interactive components (React islands)
- Plain CSS (no Tailwind, no CSS-in-JS)
- Content driven by JSON files in `src/data/`

## Design
- Aesthetic: Swiss precision, clean, minimal, clinical
- Background: `#FFFFFF` and `#F8F9FA` alternating sections
- Accent: steel blue `#1B4F8A`
- Typography: IBM Plex Sans (300, 400, 500, 600) + IBM Plex Mono (400, 500)
- All CSS lives in `src/styles/global.css` — do not use inline styles except for dynamic values
- Responsive breakpoints: 1024px (tablet), 768px (mobile), 480px (small mobile)
- Mobile nav uses a hamburger menu

## Brand voice
- Tagline: "Complex inside. Simple outside."
- Tone: precise, direct, no marketing fluff
- Use "Imbra.soft" — not "Imbra Ltd", not "IMBRA.SOFT" (except the logo mark)
- Contact email: contact@imbra.soft
- GitHub: https://github.com/Imbra-Ltd
- LinkedIn: https://linkedin.com/in/branimir-georgiev

## Content
All editable content lives in `src/data/` as JSON. Never hardcode content that a non-developer might want to change.

| File                         | Controls                                      |
|------------------------------|-----------------------------------------------|
| `src/data/site.json`         | Nav links, hero stats, contact section, footer |
| `src/data/products.json`     | Portfolio cards and detail panels             |
| `src/data/services.json`     | Services accordion items                      |
| `src/data/expertise.json`    | Domain expertise cards                        |
| `src/data/publications.json` | Research publications                         |

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

## Sections (in order)
1. Nav — logo + links + hamburger on mobile
2. Hero — headline, sub-text, stat strip (4 cards)
3. Portfolio — 3 product cards, expandable
4. Services — 10 service cards in 2-column grid, expandable
5. Expertise — 4 domain cards
6. Research & Credentials — 3 publication cards
7. Contact CTA — dark section
8. Footer — legal links, social icons, address, about text

## Reveal animations
`.reveal` → `.reveal.visible` transition handled by a single `IntersectionObserver` script in `src/layouts/Base.astro`. Do not add per-component reveal scripts.

## Conventions
- Branch naming: `feature/description`
- Static output only — no SSR, no server endpoints
- Do not commit `dist/` or `node_modules/`

## Commands
```
npm run dev      # dev server at localhost:4321
npm run build    # production build to dist/
npm run preview  # preview production build locally
```