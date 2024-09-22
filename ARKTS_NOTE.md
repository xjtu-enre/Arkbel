# Customize @babel to support ArkTS

## Memos

TODO

## environment

using node.js v20.10.4

using yarn

## Helper: AST Viewer

> Online: https://lihautan.com/babel-ast-explorer/
> GitHub Repo: https://github.com/tanhauhau/babel-ast-explorer

### Display custom AST

1. Run `make build-bundle` to bundle code files;
2. In build artifact `packages/babel-parser/lib/index.js` replace all `process.env.BABEL_8_BREAKING` with `false`;
3. Upload this file to the website.

### Make pack and to use
0. Run `yarn install` to install dependency;
1. Run `make build` to bundle code files;
2. Run `node scripts/get-declaration.js` to get declaration files in libs;
3. Open `Enre-ArkTS` and run `npm install` to get packages of 'Arkbel/parser','Arkbel/traverse','Arkbel/types'.
>To be Noticed: before run `npm install`,make sure convert node below v18.20.4
