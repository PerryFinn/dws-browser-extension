const fs = require("node:fs");
const path = require("node:path");

const patchMathIntrinsics = () => {
  // Parcel 在部分 CommonJS 相对 require 上不会自动补 .js，这里把 math-intrinsics 改成显式后缀。
  const packageDir = path.join(process.cwd(), "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics");

  if (!fs.existsSync(packageDir)) {
    throw new Error(`math-intrinsics package not found at ${packageDir}`);
  }

  for (const fileName of fs.readdirSync(packageDir)) {
    if (!fileName.endsWith(".js")) {
      continue;
    }

    const filePath = path.join(packageDir, fileName);
    const source = fs.readFileSync(filePath, "utf8");
    const patched = source.replace(/require\('\.\/([^'.]+)'\)/g, "require('./$1.js')");

    if (patched !== source) {
      fs.writeFileSync(filePath, patched);
    }
  }
};

if (require.main === module) {
  patchMathIntrinsics();
}

module.exports = {
  patchMathIntrinsics
};
