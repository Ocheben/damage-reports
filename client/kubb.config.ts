import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";
import { pluginClient } from "@kubb/plugin-client";
import { pluginSwr } from "@kubb/plugin-swr";

/**
 * Generates TS types, Zod schemas, client and SWR hooks from docs/openapi.yaml
 * into the gitignored src/generated dir. Calls route through @/lib/kubbClient
 * so cookie auth, 403 feature_disabled handling, and the flag event bus stay
 * in one place.
 */
export default defineConfig({
  root: ".",
  input: { path: "../docs/openapi.yaml" },
  output: { path: "./src/generated", clean: true },
  plugins: [
    pluginOas({
      validate: true,
      generators: [],
    }),
    pluginTs({
      output: { path: "./types" },
      group: { type: "tag" },
    }),
    pluginZod({
      output: { path: "./zod" },
      group: { type: "tag" },
      typed: true,
      coercion: false,
    }),
    pluginClient({
      output: { path: "./client" },
      group: { type: "tag" },
      // Adapter wraps apiFetch; importPath is top-level, not nested.
      importPath: "@/lib/kubbClient",
      dataReturnType: "data",
    }),
    pluginSwr({
      output: { path: "./hooks" },
      group: { type: "tag" },
      client: {
        importPath: "@/lib/kubbClient",
        dataReturnType: "data",
      },
    }),
  ],
});
