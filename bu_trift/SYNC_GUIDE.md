# Git Sync Guide for Team Collaboration

## Current Situation
- You're on the `marco` branch
- Your teammate (minjun) has 2 new commits on the `minjun` branch:
  - "message / review incomplete version"
  - "Review.ts"
- You have uncommitted local changes

## Step-by-Step Sync Process

### Option 1: Merge minjun's changes into your branch (Recommended)

#### Step 1: Save your current work
```bash
# Option A: Commit your changes
git add .
git commit -m "Your commit message describing your changes"

# OR Option B: Stash your changes (to apply later)
git stash save "WIP: my current work"
```

#### Step 2: Fetch latest changes from remote
```bash
git fetch origin
```

#### Step 3: Merge minjun's branch into yours
```bash
git merge origin/minjun
```

If there are conflicts, Git will mark them. Resolve conflicts, then:
```bash
git add .
git commit -m "Merge minjun branch into marco"
```

#### Step 4: If you stashed, restore your work
```bash
git stash pop
```

### Option 2: Pull changes if working on same branch

If you and your teammate are both working on the same branch:
```bash
git pull origin <branch-name>
```

### Option 3: Rebase (Alternative to merge)

If you prefer a linear history:
```bash
# After committing or stashing your changes
git fetch origin
git rebase origin/minjun
```

## Quick Commands Reference

### See what's different between branches
```bash
# See commits in minjun that aren't in your branch
git log marco..origin/minjun --oneline

# See what files changed
git diff marco..origin/minjun --name-status
```

### Check for conflicts before merging
```bash
git merge --no-commit --no-ff origin/minjun
git merge --abort  # If you want to cancel
```

### Push your synced branch
```bash
git push origin marco
```

## Best Practices

1. **Always commit or stash before syncing** - Don't merge with uncommitted changes
2. **Communicate with your team** - Let them know when you're syncing
3. **Test after merging** - Make sure everything still works
4. **Resolve conflicts carefully** - Don't just accept one side blindly

## Troubleshooting

### If you have merge conflicts:
1. Git will mark conflicted files
2. Open the files and look for `<<<<<<<`, `=======`, `>>>>>>>` markers
3. Edit to resolve conflicts
4. `git add <resolved-files>`
5. `git commit` to complete the merge

### To see what branch you're on:
```bash
git branch
```

### To switch branches:
```bash
git checkout <branch-name>
```

