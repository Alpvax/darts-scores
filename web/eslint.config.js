//@ts-check
import eslint from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
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
  ...pluginVue.configs["flat/recommended"],
  // ...pluginVue.configs['flat/vue2-recommended'], // Use this if you are using Vue.js 2.x.plugins: {
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
      files: ['**/*.vue'],
      languageOptions: {
          parser: vueParser,
          parserOptions: {
              parser: tseslint.parser,  // parse TS inside VUE
          },
      },
  },
  {
    rules: {
      // override/add rules settings here, such as:
      // 'vue/no-unused-vars': 'error'
      "vue/no-unused-vars": "warn",
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
