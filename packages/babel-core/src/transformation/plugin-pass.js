export default class PluginPass {
    _map = new Map();
    key;
    file;
    opts;
    // The working directory that Babel's programmatic options are loaded
    // relative to.
    cwd;
    // The absolute path of the file being compiled.
    filename;
    constructor(file, key, options) {
        this.key = key;
        this.file = file;
        this.opts = options || {};
        this.cwd = file.opts.cwd;
        this.filename = file.opts.filename;
    }
    set(key, val) {
        this._map.set(key, val);
    }
    get(key) {
        return this._map.get(key);
    }
    availableHelper(name, versionRange) {
        return this.file.availableHelper(name, versionRange);
    }
    addHelper(name) {
        return this.file.addHelper(name);
    }
    buildCodeFrameError(node, msg, _Error) {
        return this.file.buildCodeFrameError(node, msg, _Error);
    }
}
if (!process.env.BABEL_8_BREAKING) {
    PluginPass.prototype.getModuleName = function getModuleName() {
        return this.file.getModuleName();
    };
    PluginPass.prototype.addImport = function addImport() {
        this.file.addImport();
    };
}
