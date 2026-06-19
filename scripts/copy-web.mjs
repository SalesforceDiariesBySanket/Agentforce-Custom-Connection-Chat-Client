// Copies the built client (client/dist) into the server's static root
// (server/dist) so `pnpm start` serves the SPA. Cross-platform replacement for
// `cp -r`, used by the root `build` script.
import { rmSync, cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "client", "dist");
const dest = join(root, "server", "dist");

if (!existsSync(src)) {
  console.error(
    "client/dist not found. Run `pnpm build:client` before copying."
  );
  process.exit(1);
}

// Clear previously copied hashed assets so stale bundles don't pile up.
rmSync(join(dest, "assets"), { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

console.log("Copied client/dist -> server/dist");
