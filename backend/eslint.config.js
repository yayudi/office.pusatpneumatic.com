// backend/eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  pluginJs.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^(req|res|next|err|_)$" }],
      "no-var": "error",
      "prefer-const": "error",
      "no-console": "warn",
    },
  },
];
