import ImportInjector from "./import-injector.ts";
export { ImportInjector };
export { default as isModule } from "./is-module.ts";
export function addDefault(path, importedSource, opts) {
    return new ImportInjector(path).addDefault(importedSource, opts);
}
/**
 * add a named import to the program path of given path
 *
 * @export
 * @param {NodePath} path The starting path to find a program path
 * @param {string} name The name of the generated binding. Babel will prefix it with `_`
 * @param {string} importedSource The source of the import
 * @param {Partial<ImportOptions>} [opts]
 * @returns {t.Identifier | t.MemberExpression | t.SequenceExpression} If opts.ensureNoContext is true, returns a SequenceExpression,
 *   else if opts.ensureLiveReference is true, returns a MemberExpression, else returns an Identifier
 */
function addNamed(path, name, importedSource, opts) {
    return new ImportInjector(path).addNamed(name, importedSource, opts);
}
export { addNamed };
export function addNamespace(path, importedSource, opts) {
    return new ImportInjector(path).addNamespace(importedSource, opts);
}
export function addSideEffect(path, importedSource, opts) {
    return new ImportInjector(path).addSideEffect(importedSource, opts);
}
