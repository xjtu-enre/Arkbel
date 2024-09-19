import { finalize } from "./helpers/deep-array.ts";
export default class Plugin {
    key;
    manipulateOptions;
    post;
    pre;
    visitor;
    parserOverride;
    generatorOverride;
    options;
    externalDependencies;
    constructor(plugin, options, key, externalDependencies = finalize([])) {
        this.key = plugin.name || key;
        this.manipulateOptions = plugin.manipulateOptions;
        this.post = plugin.post;
        this.pre = plugin.pre;
        this.visitor = plugin.visitor || {};
        this.parserOverride = plugin.parserOverride;
        this.generatorOverride = plugin.generatorOverride;
        this.options = options;
        this.externalDependencies = externalDependencies;
    }
}
