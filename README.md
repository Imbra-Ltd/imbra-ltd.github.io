# Imbra.Soft | Software & Industrial Engineering

Website for [Imbra.Soft](https://imbra.io) — a boutique software and industrial engineering consultancy based in Varna, Bulgaria.

## Getting started

**Prerequisites**

```bash
# Git
winget install Git.Git

# Node.js 22+ (includes npm)
winget install OpenJS.NodeJS.LTS
```

**Install and run**

```bash
git clone https://github.com/Imbra-Ltd/imbra-ltd.github.io.git
cd imbra-ltd.github.io
npm install
npm run dev       # develop — hot reload at http://localhost:4321
npm run build     # compile — outputs static files to dist/
npm run preview   # verify — preview the production build locally
```

## Stack

- [Astro](https://astro.build) — static site generator
- React — interactive islands only (hamburger menu, product expand, services accordion, contact form)
- Plain CSS — no Tailwind, no CSS-in-JS
- JSON — all content in `src/data/`, no hardcoded copy in components

## Project structure

```
src/
├── data/                  # All editable content as JSON
│   ├── site.json          # Nav, hero, contact, footer
│   ├── products.json      # Portfolio products
│   ├── services.json      # Services accordion
│   ├── expertise.json     # Domain expertise cards
│   ├── publications.json  # Research publications
│   ├── process.json       # How We Work section
│   └── pricing.json       # Pricing page content
├── components/
│   ├── interactive/       # React islands (client-side JS)
│   │   ├── HamburgerMenu.tsx
│   │   ├── ProductExpand.tsx
│   │   ├── ServiceExpand.tsx
│   │   └── ContactForm.tsx
│   └── *.astro            # Static section components
├── layouts/
│   └── Base.astro         # HTML shell, global CSS, reveal script
├── pages/
│   ├── index.astro        # Homepage
│   ├── pricing.astro      # Pricing page
│   ├── imprint.astro      # Legal imprint
│   └── privacy.astro      # Privacy policy
└── styles/
    └── global.css         # All styles
```

## Editing content

All site content lives in `src/data/` as JSON files. No component knowledge required — edit the JSON, the site updates automatically.

| File                         | Controls                                       |
|------------------------------|------------------------------------------------|
| `src/data/site.json`         | Nav links, hero stats, contact section (incl. Formspree endpoint), footer |
| `src/data/products.json`     | Portfolio cards and detail panels              |
| `src/data/services.json`     | Services accordion items                       |
| `src/data/expertise.json`    | Domain expertise cards                         |
| `src/data/publications.json` | Research publications with DOI links           |
| `src/data/process.json`      | How We Work section steps                      |
| `src/data/pricing.json`      | Pricing page — all engagement models           |

## Third-party services

| Service | Purpose | Config |
|---------|---------|--------|
| [Formspree](https://formspree.io) | Contact form submissions → `contact@imbra.io` | `src/data/site.json` → `contact.formEndpoint` |
| [Plausible](https://plausible.io) | Privacy-friendly analytics (no cookies, no consent banner) | Script tag in `src/layouts/Base.astro` |

## Deployment

Pushing to `main` triggers a GitHub Actions workflow that builds the site and deploys it to GitHub Pages. No manual steps required.

**Prerequisite:** GitHub Pages must be configured to use GitHub Actions as the source (`Settings → Pages → Source → GitHub Actions`).

## Contributing

- Branch naming: `feature/description` or `fix/description`
- Always test with `npm run dev` before committing
- Create a PR for each logical group of changes