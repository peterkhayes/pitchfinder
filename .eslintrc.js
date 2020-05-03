module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["prettier", "@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    "prettier/prettier": "error",
    "no-constant-condition": "off",
  },
  overrides: [
    {
      files: ["test/**/*.js"],
      env: {
        node: true,
        mocha: true,
      }
    }
  ]
}
