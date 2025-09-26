module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: false,
  },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: ["dist/", "node_modules/"],
  overrides: [
    {
      files: ["**/*.ts"],
      parserOptions: {
        project: undefined,
      },
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
      },
    },
    {
      files: ["**/*.mjs"],
      parser: null,
      plugins: ["prettier"],
      extends: ["eslint:recommended", "plugin:prettier/recommended"],
      rules: {},
    },
    {
      files: ["tests/**/*.ts"],
      env: {
        node: true,
      },
      rules: {
        "@typescript-eslint/no-floating-promises": "off",
      },
    },
  ],
};
