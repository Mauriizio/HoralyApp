export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "*.tsbuildinfo",
      "**/*.ts",
      "**/*.tsx",
    ],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        caches: "readonly",
        console: "readonly",
        fetch: "readonly",
        Promise: "readonly",
        self: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error",
      "no-empty": "error",
    },
  },
]
