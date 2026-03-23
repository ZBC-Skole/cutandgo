const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");
const eslintPluginUnicorn = require("eslint-plugin-unicorn").default;

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      unicorn: eslintPluginUnicorn,
    },
    rules: {
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
          ignore: [
            "^_layout$",
            "^\\+not-found$",
            "^\\+html$",
            "^\\+native-intent$",
            "^\\[.+\\]$",
            "^\\(.*\\)$",
          ],
        },
      ],
    },
  },
  {
    ignores: ["dist/*", "/.expo", "node_modules"],
  },
]);
