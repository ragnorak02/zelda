# Git Workflow

## Quick Reference

### "Please commit everything"
When you say this, the following happens:

1. **`git status`** — review all changed/untracked files
2. **Secret scan** — scan for `.env`, private keys, API tokens, credentials, certificates
3. **If clean** — stage intended files and commit
4. **If suspicious** — STOP, warn, list files, recommend `.gitignore` updates
5. **Push** only if remote origin exists and auth succeeds

### Commit Message Format
```
chore(checkpoint): update progress + dashboards
```

Other formats used:
```
feat(system): short description of what was added
fix(system): short description of what was fixed
refactor(system): short description of structural change
```

## Checkpoint Steps (Manual)

```bash
# 1. Check status
git status

# 2. Review changes
git diff

# 3. Stage files (be specific — avoid `git add .`)
git add claude.md game_direction.md test_plan.md status.html
git add js/game.js js/player.js  # etc.

# 4. Commit
git commit -m "chore(checkpoint): update progress + dashboards"

# 5. Push (only if remote is configured)
git push origin main
```

## Safety Rules

### Never Commit
- `.env` files (API keys, secrets)
- `*.key`, `*.pem`, `*.p12`, `*.pfx` (private keys/certs)
- `node_modules/` (dependencies)
- `build/`, `dist/` (generated output)
- IDE/editor config that's user-specific

### Before Every Commit
- Run secret scan (check for keys, tokens, passwords in staged files)
- Review `git diff --staged` to verify only intended changes
- Verify no large binary files are staged

### Push Behavior
- Only push when explicitly requested
- Only push if `git remote -v` shows a configured origin
- Never force-push to `main` without explicit confirmation
- If push fails (auth, network), print the exact error and next steps

## .gitignore Coverage
See `.gitignore` in repo root. Covers:
- Environment files and secrets
- Private keys and certificates
- Node.js artifacts
- Build output
- OS and IDE files
- Engine-specific caches
