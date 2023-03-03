// build in extension directory

import fs from "fs";

const filesToCopy = [
  { from: "./src/manifest/cr", to: "./dist/cr" },
  { from: "./src/manifest/ff", to: "./dist/ff" },
  { from: "./src/img", to: ["./dist/cr/img", "./dist/ff/img"] },
  { from: "./src/_locales", to: ["./dist/cr/_locales", "./dist/ff/_locales"] },
];

function cpFiles() {
  return {
    name: "cp-files",
    buildEnd() {
      const log = (msg) => console.log("\x1b[36m%s\x1b[0m", msg);
      log(`copying static assets`);
      filesToCopy.forEach((me) => {
        // if "to" parameter is not an array, make it so
        me.to = [me.to].flat();
        me.to.forEach((it) => {
          fs.cp(me.from, it, { recursive: true, force: true }, (err) => {
            if (err) {
              console.error(err);
            }
          });
        });
      });
    },
  };
}

export default [
  {
    input: "./src/background/index.js",
    output: [
      {
        file: "./dist/cr/js/background.js",
        format: "iife",
      },
      {
        file: "./dist/ff/js/background.js",
        format: "iife",
      },
    ],
    plugins: [cpFiles()],
  },
  {
    input: "./src/content/index.js",
    output: [
      {
        file: "./dist/cr/js/content.js",
        format: "iife",
      },
      {
        file: "./dist/ff/js/content.js",
        format: "iife",
      },
    ],
    plugins: [cpFiles()],
  },
];
