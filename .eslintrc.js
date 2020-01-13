module.exports = {
  parser: "babel-eslint",
  plugins: ["prettier"],
  ecmaFeatures: {
    modules: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended",
  ],
  env: {
    commonjs: true,
    es6: true,
  },
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
