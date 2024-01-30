# Customize @babel to support ArkTS

## Memos

TODO

## Helper: AST Viewer

> Online: https://lihautan.com/babel-ast-explorer/
> GitHub Repo: https://github.com/tanhauhau/babel-ast-explorer

### Display custom AST

1. Run `make build-bundle` to bundle code files;
2. In build artifact `packages/babel-parser/lib/index.js` replace all `process.env.BABEL_8_BREAKING` with `false`;
3. Upload this file to the website.
