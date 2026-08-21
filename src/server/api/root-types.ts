import type { appRouter } from "./root";

/**
 * Type-only export of the app router.
 *
 * Client components must import `AppRouter` from this module rather than
 * from `~/server/api/root`. Importing from `root` pulls the server router
 * (and its `@clerk/nextjs/server` imports) into the client module graph,
 * which Next.js 16 / Turbopack rejects via the `server-only` boundary.
 * The `import type` here is erased at compile time, so this module has no
 * runtime dependency on the router.
 */
export type AppRouter = typeof appRouter;
