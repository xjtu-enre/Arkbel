// Heavily inspired by
// https://github.com/airbnb/babel-plugin-dynamic-import-node/blob/master/src/utils.js
import { types as t, template } from "@babel/core";
import { buildDynamicImport } from "@babel/helper-module-transforms";
const requireNoInterop = (source) => template.expression.ast `require(${source})`;
const requireInterop = (source, file) => t.callExpression(file.addHelper("interopRequireWildcard"), [
    requireNoInterop(source),
]);
export function transformDynamicImport(path, noInterop, file) {
    const buildRequire = noInterop ? requireNoInterop : requireInterop;
    path.replaceWith(buildDynamicImport(path.node, true, false, specifier => buildRequire(specifier, file)));
}
