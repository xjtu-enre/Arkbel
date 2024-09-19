import assert from "assert";
import { numericLiteral, sequenceExpression } from "@babel/types";
import ImportBuilder from "./import-builder.ts";
import isModule from "./is-module.ts";
/**
 * A general helper classes add imports via transforms. See README for usage.
 */
export default class ImportInjector {
    /**
     * The default options to use with this instance when imports are added.
     */
    _defaultOpts = {
        importedSource: null,
        importedType: "commonjs",
        importedInterop: "babel",
        importingInterop: "babel",
        ensureLiveReference: false,
        ensureNoContext: false,
        importPosition: "before",
    };
    constructor(path, importedSource, opts) {
        const programPath = path.find(p => p.isProgram());
        this._programPath = programPath;
        this._programScope = programPath.scope;
        this._hub = programPath.hub;
        this._defaultOpts = this._applyDefaults(importedSource, opts, true);
    }
    addDefault(importedSourceIn, opts) {
        return this.addNamed("default", importedSourceIn, opts);
    }
    addNamed(importName, importedSourceIn, opts) {
        assert(typeof importName === "string");
        return this._generateImport(this._applyDefaults(importedSourceIn, opts), importName);
    }
    addNamespace(importedSourceIn, opts) {
        return this._generateImport(this._applyDefaults(importedSourceIn, opts), null);
    }
    addSideEffect(importedSourceIn, opts) {
        return this._generateImport(this._applyDefaults(importedSourceIn, opts), void 0);
    }
    _applyDefaults(importedSource, opts, isInit = false) {
        let newOpts;
        if (typeof importedSource === "string") {
            newOpts = { ...this._defaultOpts, importedSource, ...opts };
        }
        else {
            assert(!opts, "Unexpected secondary arguments.");
            newOpts = { ...this._defaultOpts, ...importedSource };
        }
        if (!isInit && opts) {
            if (opts.nameHint !== undefined)
                newOpts.nameHint = opts.nameHint;
            if (opts.blockHoist !== undefined)
                newOpts.blockHoist = opts.blockHoist;
        }
        return newOpts;
    }
    _generateImport(opts, importName) {
        const isDefault = importName === "default";
        const isNamed = !!importName && !isDefault;
        const isNamespace = importName === null;
        const { importedSource, importedType, importedInterop, importingInterop, ensureLiveReference, ensureNoContext, nameHint, importPosition, 
        // Not meant for public usage. Allows code that absolutely must control
        // ordering to set a specific hoist value on the import nodes.
        // This is ignored when "importPosition" is "after".
        blockHoist, } = opts;
        // Provide a hint for generateUidIdentifier for the local variable name
        // to use for the import, if the code will generate a simple assignment
        // to a variable.
        let name = nameHint || importName;
        const isMod = isModule(this._programPath);
        const isModuleForNode = isMod && importingInterop === "node";
        const isModuleForBabel = isMod && importingInterop === "babel";
        if (importPosition === "after" && !isMod) {
            throw new Error(`"importPosition": "after" is only supported in modules`);
        }
        const builder = new ImportBuilder(importedSource, this._programScope, this._hub);
        if (importedType === "es6") {
            if (!isModuleForNode && !isModuleForBabel) {
                throw new Error("Cannot import an ES6 module from CommonJS");
            }
            // import * as namespace from ''; namespace
            // import def from ''; def
            // import { named } from ''; named
            builder.import();
            if (isNamespace) {
                builder.namespace(nameHint || importedSource);
            }
            else if (isDefault || isNamed) {
                builder.named(name, importName);
            }
        }
        else if (importedType !== "commonjs") {
            throw new Error(`Unexpected interopType "${importedType}"`);
        }
        else if (importedInterop === "babel") {
            if (isModuleForNode) {
                // import _tmp from ''; var namespace = interopRequireWildcard(_tmp); namespace
                // import _tmp from ''; var def = interopRequireDefault(_tmp).default; def
                // import _tmp from ''; _tmp.named
                name = name !== "default" ? name : importedSource;
                const es6Default = `${importedSource}$es6Default`;
                builder.import();
                if (isNamespace) {
                    builder
                        .default(es6Default)
                        .var(name || importedSource)
                        .wildcardInterop();
                }
                else if (isDefault) {
                    if (ensureLiveReference) {
                        builder
                            .default(es6Default)
                            .var(name || importedSource)
                            .defaultInterop()
                            .read("default");
                    }
                    else {
                        builder
                            .default(es6Default)
                            .var(name)
                            .defaultInterop()
                            .prop(importName);
                    }
                }
                else if (isNamed) {
                    builder.default(es6Default).read(importName);
                }
            }
            else if (isModuleForBabel) {
                // import * as namespace from ''; namespace
                // import def from ''; def
                // import { named } from ''; named
                builder.import();
                if (isNamespace) {
                    builder.namespace(name || importedSource);
                }
                else if (isDefault || isNamed) {
                    builder.named(name, importName);
                }
            }
            else {
                // var namespace = interopRequireWildcard(require(''));
                // var def = interopRequireDefault(require('')).default; def
                // var named = require('').named; named
                builder.require();
                if (isNamespace) {
                    builder.var(name || importedSource).wildcardInterop();
                }
                else if ((isDefault || isNamed) && ensureLiveReference) {
                    if (isDefault) {
                        name = name !== "default" ? name : importedSource;
                        builder.var(name).read(importName);
                        builder.defaultInterop();
                    }
                    else {
                        builder.var(importedSource).read(importName);
                    }
                }
                else if (isDefault) {
                    builder.var(name).defaultInterop().prop(importName);
                }
                else if (isNamed) {
                    builder.var(name).prop(importName);
                }
            }
        }
        else if (importedInterop === "compiled") {
            if (isModuleForNode) {
                // import namespace from ''; namespace
                // import namespace from ''; namespace.default
                // import namespace from ''; namespace.named
                builder.import();
                if (isNamespace) {
                    builder.default(name || importedSource);
                }
                else if (isDefault || isNamed) {
                    builder.default(importedSource).read(name);
                }
            }
            else if (isModuleForBabel) {
                // import * as namespace from ''; namespace
                // import def from ''; def
                // import { named } from ''; named
                // Note: These lookups will break if the module has no __esModule set,
                // hence the warning that 'compiled' will not work on standard CommonJS.
                builder.import();
                if (isNamespace) {
                    builder.namespace(name || importedSource);
                }
                else if (isDefault || isNamed) {
                    builder.named(name, importName);
                }
            }
            else {
                // var namespace = require(''); namespace
                // var namespace = require(''); namespace.default
                // var namespace = require(''); namespace.named
                // var named = require('').named;
                builder.require();
                if (isNamespace) {
                    builder.var(name || importedSource);
                }
                else if (isDefault || isNamed) {
                    if (ensureLiveReference) {
                        builder.var(importedSource).read(name);
                    }
                    else {
                        builder.prop(importName).var(name);
                    }
                }
            }
        }
        else if (importedInterop === "uncompiled") {
            if (isDefault && ensureLiveReference) {
                throw new Error("No live reference for commonjs default");
            }
            if (isModuleForNode) {
                // import namespace from ''; namespace
                // import def from ''; def;
                // import namespace from ''; namespace.named
                builder.import();
                if (isNamespace) {
                    builder.default(name || importedSource);
                }
                else if (isDefault) {
                    builder.default(name);
                }
                else if (isNamed) {
                    builder.default(importedSource).read(name);
                }
            }
            else if (isModuleForBabel) {
                // import namespace from '';
                // import def from '';
                // import { named } from ''; named;
                // Note: These lookups will break if the module has __esModule set,
                // hence the warning that 'uncompiled' will not work on ES6 transpiled
                // to CommonJS.
                builder.import();
                if (isNamespace) {
                    builder.default(name || importedSource);
                }
                else if (isDefault) {
                    builder.default(name);
                }
                else if (isNamed) {
                    builder.named(name, importName);
                }
            }
            else {
                // var namespace = require(''); namespace
                // var def = require(''); def
                // var namespace = require(''); namespace.named
                // var named = require('').named;
                builder.require();
                if (isNamespace) {
                    builder.var(name || importedSource);
                }
                else if (isDefault) {
                    builder.var(name);
                }
                else if (isNamed) {
                    if (ensureLiveReference) {
                        builder.var(importedSource).read(name);
                    }
                    else {
                        builder.var(name).prop(importName);
                    }
                }
            }
        }
        else {
            throw new Error(`Unknown importedInterop "${importedInterop}".`);
        }
        const { statements, resultName } = builder.done();
        this._insertStatements(statements, importPosition, blockHoist);
        if ((isDefault || isNamed) &&
            ensureNoContext &&
            resultName.type !== "Identifier") {
            return sequenceExpression([numericLiteral(0), resultName]);
        }
        return resultName;
    }
    _insertStatements(statements, importPosition = "before", blockHoist = 3) {
        const body = this._programPath.get("body");
        if (importPosition === "after") {
            for (let i = body.length - 1; i >= 0; i--) {
                if (body[i].isImportDeclaration()) {
                    body[i].insertAfter(statements);
                    return;
                }
            }
        }
        else {
            statements.forEach(node => {
                // @ts-expect-error handle _blockHoist
                node._blockHoist = blockHoist;
            });
            const targetPath = body.find(p => {
                // @ts-expect-error todo(flow->ts): avoid mutations
                const val = p.node._blockHoist;
                return Number.isFinite(val) && val < 4;
            });
            if (targetPath) {
                targetPath.insertBefore(statements);
                return;
            }
        }
        this._programPath.unshiftContainer("body", statements);
    }
}
