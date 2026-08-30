<!-- BEGIN:nextjs-agent-rules -->

# This is not the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Resolve that path from this file's directory because the `next` package may not be visible from a monorepo root. Heed deprecation notices.

`next dev` writes this block and adds it again if removed. Verify that behavior at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing the block from a diff only recreates the uncommitted change. Commit it with the related work to keep the tree clean.

<!-- END:nextjs-agent-rules -->
