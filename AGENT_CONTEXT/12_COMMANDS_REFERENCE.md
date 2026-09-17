# Commands Reference

## Baseline

```powershell
cd "C:\Users\Lucilfer\Documents\Stable-Ecommerce"

git status
git remote -v
git branch --show-current
git log -5 --oneline

node --version
npm --version

npm ci
npm run lint
npm test
npm run build
npm run qa:fast
npm run qa:release
```

## E2E

```powershell
npm run test:e2e
```

## GitHub

```powershell
gh auth status
gh run list
gh run view <run-id>
```

## Stripe

```powershell
stripe --version
stripe config --list
stripe listen
```

Use test mode and controlled events.

## Supabase

```powershell
supabase --version
supabase projects list
supabase link --project-ref dporfgsbwsyqzmlnqrug
supabase migration list
```

## Prohibited initially

```powershell
supabase db reset --linked
supabase db push
supabase migration repair
npm audit fix --force
```
