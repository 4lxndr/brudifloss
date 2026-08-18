import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["public/", ".build/", ".wrangler/", "node_modules/"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      // Das Spiel nutzt bewusst ein locker typisiertes sim-Objekt
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
