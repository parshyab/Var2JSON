import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const isWatch = process.argv.includes("--watch");

const inlineHtmlPlugin = {
  name: "inline-html",
  setup(build) {
    build.onEnd(() => {
      const uiTemplatePath = path.resolve("src/ui.html");
      const controllerJsPath = path.resolve("dist/ui.js");
      const outputHtmlPath = path.resolve("dist/ui.html");

      if (!fs.existsSync(uiTemplatePath)) return;
      if (!fs.existsSync(controllerJsPath)) return;

      let html = fs.readFileSync(uiTemplatePath, "utf8");
      const js = fs.readFileSync(controllerJsPath, "utf8");

      html = html.replace(
        "<!-- INLINE_SCRIPT -->",
        `<script>${js}</script>`
      );

      fs.writeFileSync(outputHtmlPath, html, "utf8");
      fs.unlinkSync(controllerJsPath);
    });
  },
};

fs.mkdirSync("dist", { recursive: true });

const controllerConfig = {
  entryPoints: ["src/controller.ts"],
  bundle: true,
  outfile: "dist/controller.js",
  format: "iife",
  target: "es2020",
  logLevel: "info",
};

const uiConfig = {
  entryPoints: ["src/ui-script.ts"],
  bundle: true,
  outfile: "dist/ui.js",
  format: "iife",
  target: "es2020",
  logLevel: "info",
  plugins: [inlineHtmlPlugin],
};

if (isWatch) {
  const ctxController = await esbuild.context(controllerConfig);
  const ctxUi = await esbuild.context(uiConfig);
  await ctxController.watch();
  await ctxUi.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(controllerConfig);
  await esbuild.build(uiConfig);
  console.log("Build complete.");
}
