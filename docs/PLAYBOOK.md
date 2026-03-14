# Imbra.Soft Website — Developer Playbook

## Astro

```bash
npm run dev       # start dev server with hot reload at http://localhost:4321
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

---

## Git workflow

### Daily workflow

```bash
# Start a new feature or fix
git checkout main
git pull
git checkout -b feature/description   # or fix/description

# Stage and commit
git add <file1> <file2>
git commit -m "feat: short description"

# Push and open PR
git push -u origin feature/description
gh pr create
```

### Commit message conventions

```
feat:   new feature
fix:    bug fix
chore:  maintenance, releases, tooling
docs:   documentation only
style:  CSS/formatting, no logic change
refactor: code change that neither fixes a bug nor adds a feature
```

### Tagging a release

```bash
git checkout main
git pull

# Create an empty release marker commit
git commit --allow-empty -m "chore: release v0.0.1.0"

# Tag and push
git tag v0.0.1.0
git push
git push origin v0.0.1.0
```

### Useful git commands

```bash
git log --oneline -20          # compact commit history
git diff                       # unstaged changes
git diff --staged              # staged changes
git status                     # working tree status
git stash                      # stash uncommitted changes
git stash pop                  # restore stashed changes
git tag                        # list all tags
git checkout v0.0.1.0          # checkout a specific release
```

---

## GitHub CLI (gh)

### Issues

```bash
gh issue list --repo Imbra-Ltd/imbra-ltd.github.io --state open
gh issue create --repo Imbra-Ltd/imbra-ltd.github.io --title "Title" --body "Body"
gh issue edit 12 --repo Imbra-Ltd/imbra-ltd.github.io --title "New title"
gh issue close 12 --repo Imbra-Ltd/imbra-ltd.github.io
gh issue close 12 --repo Imbra-Ltd/imbra-ltd.github.io --comment "Reason"
```

### Milestones

```bash
# Create a milestone
gh api repos/Imbra-Ltd/imbra-ltd.github.io/milestones \
  --method POST --field title="v0.0.2.0"

# Assign issue to milestone
gh issue edit 8 --repo Imbra-Ltd/imbra-ltd.github.io --milestone "v0.0.2.0"
```

### Pull requests

```bash
gh pr create --repo Imbra-Ltd/imbra-ltd.github.io \
  --title "feat: description" \
  --body "## Summary\n..."

gh pr list --repo Imbra-Ltd/imbra-ltd.github.io
gh pr view 37 --repo Imbra-Ltd/imbra-ltd.github.io
gh pr merge 37 --repo Imbra-Ltd/imbra-ltd.github.io
```

### Releases

```bash
gh release create v0.0.1.0 \
  --repo Imbra-Ltd/imbra-ltd.github.io \
  --title "v0.0.1.0" \
  --notes "Release notes here"

gh release list --repo Imbra-Ltd/imbra-ltd.github.io
```

> **Windows note:** `gh` must be invoked via full path on Windows:
> `"/c/Program Files/GitHub CLI/gh.exe"`

---

## Content editing

All site content lives in `src/data/` as JSON. No component knowledge required.

| File | Controls |
|------|----------|
| `src/data/site.json` | Nav links, hero stats, contact section (incl. Formspree endpoint), footer |
| `src/data/products.json` | Portfolio cards and detail panels |
| `src/data/services.json` | Services accordion items |
| `src/data/expertise.json` | Domain expertise cards |
| `src/data/publications.json` | Research publications with DOI links |
| `src/data/process.json` | How We Work section steps |
| `src/data/pricing.json` | Pricing page — all engagement models |

---

## Third-party services

| Service                           | Purpose                           | Config                                        |
|-----------------------------------|-----------------------------------|-----------------------------------------------|
| [Formspree](https://formspree.io) | Contact form → `contact@imbra.io` | `src/data/site.json` → `contact.formEndpoint` |
| [Plausible](https://plausible.io) | Privacy-friendly analytics        | Script tag in `src/layouts/Base.astro`        |

---

## Deployment

Pushing to `main` triggers GitHub Actions which builds and deploys to GitHub Pages automatically. No manual steps required.

```bash
git checkout main
git push   # triggers deploy
```

Monitor the deployment at:
`https://github.com/Imbra-Ltd/imbra-ltd.github.io/actions`