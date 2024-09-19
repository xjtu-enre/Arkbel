import { createRequire } from "module";
import path from "path";
const fileToDeps = new Map();
const depToFiles = new Map();
let isWatchMode = false;
let watcher;
const watchQueue = new Set();
let hasStarted = false;
export function enable({ enableGlobbing }) {
    isWatchMode = true;
    const { FSWatcher } = requireChokidar();
    const options = {
        disableGlobbing: !enableGlobbing,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 50,
            pollInterval: 10,
        },
    };
    watcher = new FSWatcher(options);
    watcher.on("unlink", unwatchFile);
}
export function startWatcher() {
    hasStarted = true;
    for (const dep of watchQueue) {
        watcher.add(dep);
    }
    watchQueue.clear();
    watcher.on("ready", () => {
        console.log("The watcher is ready.");
    });
}
export function watch(filename) {
    if (!isWatchMode) {
        throw new Error("Internal Babel error: .watch called when not in watch mode.");
    }
    if (!hasStarted) {
        watchQueue.add(path.resolve(filename));
    }
    else {
        watcher.add(path.resolve(filename));
    }
}
/**
 * Call @param callback whenever a dependency (source file)/
 * external dependency (non-source file) changes.
 *
 * Handles mapping external dependencies to their corresponding
 * dependencies.
 */
export function onFilesChange(callback) {
    if (!isWatchMode) {
        throw new Error("Internal Babel error: .onFilesChange called when not in watch mode.");
    }
    watcher.on("all", (event, filename) => {
        if (event !== "change" && event !== "add")
            return;
        const absoluteFile = path.resolve(filename);
        callback([absoluteFile, ...(depToFiles.get(absoluteFile) ?? [])], event, absoluteFile);
    });
}
export function updateExternalDependencies(filename, dependencies) {
    if (!isWatchMode)
        return;
    // Use absolute paths
    const absFilename = path.resolve(filename);
    const absDependencies = new Set(Array.from(dependencies, dep => path.resolve(dep)));
    const deps = fileToDeps.get(absFilename);
    if (deps) {
        for (const dep of deps) {
            if (!absDependencies.has(dep)) {
                removeFileDependency(absFilename, dep);
            }
        }
    }
    for (const dep of absDependencies) {
        let deps = depToFiles.get(dep);
        if (!deps) {
            depToFiles.set(dep, (deps = new Set()));
            if (!hasStarted) {
                watchQueue.add(dep);
            }
            else {
                watcher.add(dep);
            }
        }
        deps.add(absFilename);
    }
    fileToDeps.set(absFilename, absDependencies);
}
function removeFileDependency(filename, dep) {
    const deps = depToFiles.get(dep);
    deps.delete(filename);
    if (deps.size === 0) {
        depToFiles.delete(dep);
        if (!hasStarted) {
            watchQueue.delete(dep);
        }
        else {
            watcher.unwatch(dep);
        }
    }
}
function unwatchFile(filename) {
    const deps = fileToDeps.get(filename);
    if (!deps)
        return;
    for (const dep of deps) {
        removeFileDependency(filename, dep);
    }
    fileToDeps.delete(filename);
}
function requireChokidar() {
    const require = createRequire(import.meta.url);
    try {
        return process.env.BABEL_8_BREAKING
            ? require("chokidar")
            : parseInt(process.versions.node) >= 8
                ? require("chokidar")
                : require("@nicolo-ribaudo/chokidar-2");
    }
    catch (err) {
        console.error("The optional dependency chokidar failed to install and is required for " +
            "--watch. Chokidar is likely not supported on your platform.");
        throw err;
    }
}
