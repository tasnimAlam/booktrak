import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";

// Serves the built web app (web/dist) in production, so web and /api share one origin.
const staticFiles: FastifyPluginAsync<{ root: string }> = async (
  app,
  { root },
) => {
  await app.register(fastifyStatic, {
    root,
    wildcard: false, // routes are created per file at startup, so a missing file falls to the 404 handler
    cacheControl: false, // set below instead of the plugin's single max-age for every file
    setHeaders(reply, path) {
      // Vite fingerprints files in /assets, so they can be cached forever; index.html must revalidate.
      reply.header(
        "Cache-Control",
        path.includes("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
    },
  });
};

export default staticFiles;
