module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ["@typescript-eslint", "jsdoc"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    browser: true,
    es2021: true
  },
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "jsdoc/require-jsdoc": [
      "warn",
      {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          ClassDeclaration: true,
          MethodDefinition: true,
          ArrowFunctionExpression: false
        }
      }
    ],
    "jsdoc/require-description": ["warn", { contexts: ["any"] }],
    "jsdoc/require-param-description": "warn",
    "jsdoc/require-returns-description": "warn"
  }
};
