// Heavily inspired by
// https://github.com/airbnb/babel-plugin-dynamic-import-node/blob/master/src/utils.js
import { types as t, template } from "@babel/core";
if (!process.env.BABEL_8_BREAKING && !USE_ESM && !IS_STANDALONE) {
    // eslint-disable-next-line no-restricted-globals
    exports.getDynamicImportSource = function getDynamicImportSource(node) {
        const [source] = node.arguments;
        return t.isStringLiteral(source) || t.isTemplateLiteral(source)
            ? source
            : template.expression.ast `\`\${${source}}\``;
    };
}
export function buildDynamicImport(node, deferToThen, wrapWithPromise, builder) {
    const specifier = t.isCallExpression(node) ? node.arguments[0] : node.source;
    if (t.isStringLiteral(specifier) ||
        (t.isTemplateLiteral(specifier) && specifier.quasis.length === 0)) {
        if (deferToThen) {
            return template.expression.ast `
        Promise.resolve().then(() => ${builder(specifier)})
      `;
        }
        else
            return builder(specifier);
    }
    const specifierToString = t.isTemplateLiteral(specifier)
        ? t.identifier("specifier")
        : t.templateLiteral([t.templateElement({ raw: "" }), t.templateElement({ raw: "" })], [t.identifier("specifier")]);
    if (deferToThen) {
        return template.expression.ast `
      (specifier =>
        new Promise(r => r(${specifierToString}))
          .then(s => ${builder(t.identifier("s"))})
      )(${specifier})
    `;
    }
    else if (wrapWithPromise) {
        return template.expression.ast `
      (specifier =>
        new Promise(r => r(${builder(specifierToString)}))
      )(${specifier})
    `;
    }
    else {
        return template.expression.ast `
      (specifier => ${builder(specifierToString)})(${specifier})
    `;
    }
}
