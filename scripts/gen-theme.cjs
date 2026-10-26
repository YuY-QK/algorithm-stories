#!/usr/bin/env node
// 从 src/theme/tokens.json 生成 src/styles/tokens.css（主题变量的唯一来源）。
// 用法：node scripts/gen-theme.cjs（npm run gen:theme）。tests/theme.test.ts 检查生成结果和 tokens.json 一致。
"use strict";

const fs = require("fs");
const path = require("path");

const decl = (vars, pad) => Object.entries(vars).map(([k, v]) => pad + "--" + k + ": " + v + ";").join("\n");

/** 由 tokens 对象生成 CSS 文本 */
function generate(tokens) {
  const { light, dark, common } = tokens;
  const darkBody = decl(dark, "    ") + "\n    color-scheme: dark;";
  return [
    "/* 由 scripts/gen-theme.cjs 从 src/theme/tokens.json 生成，不要手改。 */",
    ":root {",
    decl(light, "  "),
    decl(common, "  "),
    "}",
    "@media (prefers-color-scheme: dark) {",
    "  :root:not([data-theme=\"light\"]) {",
    darkBody,
    "  }",
    "}",
    ":root[data-theme=\"dark\"] {",
    darkBody.replace(/^ {2}/gm, ""),
    "}",
    "",
  ].join("\n");
}

const root = path.join(__dirname, "..");
const tokensFile = path.join(root, "src/theme/tokens.json");
const outFile = path.join(root, "src/styles/tokens.css");

if (require.main === module) {
  fs.writeFileSync(outFile, generate(JSON.parse(fs.readFileSync(tokensFile, "utf8"))));
  console.log("wrote " + path.relative(root, outFile));
}

module.exports = { generate, tokensFile, outFile };
