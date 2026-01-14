//@ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
export default [
  {
    ignores: [
      "**/.firebase/",
      "**/node_modules/"
    ],
  },
  eslint.configs.recommended,
  // add more generic rulesets here, such as:
  // js.configs.recommended,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        project: "./tsconfig.app.json",
        extraFileExtensions: [".vue"],
        sourceType: "module",
      },
    },
  },
  eslintConfigPrettier,
  {
    rules: {
      // override/add rules settings here, such as:
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "vars": "all",
        args: "after-used",
        "caughtErrors": "all",
        argsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        ignoreRestSiblings: true,
        reportUsedIgnorePattern: true,
      }],
    }
  }
];
