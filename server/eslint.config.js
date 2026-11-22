import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["node_modules", "venv", "screenshots", "storage"]),
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
]);
