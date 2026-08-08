# AutoClaude Project Context

Generated at: 2026-06-12T06:35:26.501Z

---

# Project Context

## Workspace
- **Root**: /Users/aagatech/ophthaxpwebsite/website
- **Type**: single
- **Last Updated**: 2026-06-12T06:35:25.823Z

## Statistics
- **Total Files**: 144
- **Estimated Lines**: 298872
- **Average File Size**: 246678 bytes

## Languages
- **typescriptreact**: 16422 files
- **json**: 10102 files
- **javascript**: 9040 files
- **typescript**: 5796 files
- **markdown**: 965 files
- **css**: 483 files

## Project Structure
- **Main Languages**: Not detected
- **Frameworks**: None detected
- **Test Frameworks**: None detected
- **Build Tools**: None detected

## Configuration Files
- package.json
- tsconfig.json


## NPM Dependencies
### Production
lucide-react, next, nodemailer, react, react-dom

### Development
@types/node, @types/nodemailer, @types/react, @types/react-dom, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, typescript


## Largest Files
- .next/cache/webpack/client-development/1.pack.gz (10026KB)
- .next/static/chunks/main-app.js (5884KB)
- public/Screen Recording 2026-05-09 132251.mp4 (4574KB)
- .next/cache/webpack/server-development/1.pack.gz (2361KB)
- .next/cache/webpack/server-development/4.pack.gz (1861KB)
- public/mainvideothumnailimage.png (1705KB)
- .next/cache/webpack/client-development/2.pack.gz (1239KB)
- public/Ophtha_Certificate.png (1211KB)
- .next/static/chunks/app/page.js (1095KB)
- .next/server/app/page.js (672KB)


---

# Task Summary

## Overall Statistics
- **Total Tasks**: 0
- **Pending**: 0
- **In Progress**: 0
- **Completed**: 0
- **Failed**: 0

## Current Session
- **Session ID**: mqaj25fr-a5jqihr
- **Started**: 2026-06-12T06:10:25.671Z
- **Tasks in Session**: 0

## Recent Tasks



---

## Unfinished Tasks
No unfinished tasks

---

## Recent Changes

### Git Status
```
 M .autoclaude/CLAUDE_CONTEXT.md
 M .autoclaude/cache/project-index.json
 M src/components/Footer.tsx

```

### Recent Commits
```
7d0a105 login mnavigation issue fixed
2d56d5a footer issues fixed
6bf8fb7 footer issues fixed
fe6b819 Fix footer issue
b381601 footer changes completed
4aa75ee footer changes completed
b52bbc4 Footer section changes
bc15ffc main footer changes
984b251 logo and footer changes
9586d7a asp and prevellence removeds

```

---

## Current File Context
# File Context: src/components/Navbar.tsx

- **Size**: 1845 bytes
- **Language**: typescriptreact
- **Last Modified**: 2026-06-12T06:16:31.546Z
- **Hash**: e966b7af282c4d8a3ccd977b0f1ef3fd


## Symbols
- **Navbar** (Function)

### Visible Content (first 50 lines)
```typescriptreact
import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-ink-950/90 backdrop-blur-md border-b border-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-3 sm:px-16 lg:px-24"
      >
        <Link href="/" aria-label="OphthaXP — home" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="OphthaXP"
            width={410}
            height={74}
            priority
            className="h-[68px] w-auto"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop: full pill — Mobile: icon-only */}
          <Link
            href="#smart-assist"
            aria-label="Ask OphthaXP"
            className="inline-flex items-center gap-1.5 rounded-[12px] border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/85 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:px-3.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent-soft" aria-hidden />
            <span className="hidden sm:inline">Ask LoMa</span>
          </Link>
         <Link
            href="https://learn.ophthaxp.com/"
            className="rounded-[12px] bg-white px-4 py-1.5 text-xs font-semibold text-ink-950 shadow-sm transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
          >
            Login
          </Link>
        </div>
      </nav>
    </header>
  );
}

```