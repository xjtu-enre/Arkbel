import readdirRecursive from "fs-readdir-recursive";
import * as babel from "@babel/core";
import path from "path";
import fs from "fs";
import * as watcher from "./watcher.ts";
export function chmod(src, dest) {
    try {
        fs.chmodSync(dest, fs.statSync(src).mode);
    }
    catch (err) {
        console.warn(`Cannot change permissions of ${dest}`);
    }
}
export function readdir(dirname, includeDotfiles, filter) {
    return readdirRecursive(dirname, (filename, index, currentDirectory) => {
        const stat = fs.statSync(path.join(currentDirectory, filename));
        if (stat.isDirectory())
            return true;
        return ((includeDotfiles || filename[0] !== ".") && (!filter || filter(filename)));
    });
}
export function readdirForCompilable(dirname, includeDotfiles, altExts) {
    return readdir(dirname, includeDotfiles, function (filename) {
        return isCompilableExtension(filename, altExts);
    });
}
/**
 * Test if a filename ends with a compilable extension.
 */
export function isCompilableExtension(filename, altExts) {
    const exts = altExts || babel.DEFAULT_EXTENSIONS;
    const ext = path.extname(filename);
    return exts.includes(ext);
}
export function addSourceMappingUrl(code, loc) {
    return code + "\n//# sourceMappingURL=" + path.basename(loc);
}
export function hasDataSourcemap(code) {
    const pos = code.lastIndexOf("\n", code.length - 2);
    return pos != -1 && code.lastIndexOf("//# sourceMappingURL") < pos;
}
const CALLER = {
    name: "@babel/cli",
};
export function transformRepl(filename, code, opts) {
    opts = {
        ...opts,
        caller: CALLER,
        filename,
    };
    return new Promise((resolve, reject) => {
        babel.transform(code, opts, (err, result) => {
            if (err)
                reject(err);
            else
                resolve(result);
        });
    });
}
export async function compile(filename, opts) {
    opts = {
        ...opts,
        caller: CALLER,
    };
    const result = process.env.BABEL_8_BREAKING
        ? await babel.transformFileAsync(filename, opts)
        : await new Promise((resolve, reject) => {
            babel.transformFile(filename, opts, (err, result) => {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
        });
    if (result) {
        if (!process.env.BABEL_8_BREAKING) {
            if (!result.externalDependencies)
                return result;
        }
        watcher.updateExternalDependencies(filename, result.externalDependencies);
    }
    return result;
}
export function deleteDir(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file) {
            const curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteDir(curPath);
            }
            else {
                // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}
process.on("uncaughtException", function (err) {
    console.error(err);
    process.exitCode = 1;
});
export function withExtension(filename, ext = ".js") {
    const newBasename = path.basename(filename, path.extname(filename)) + ext;
    return path.join(path.dirname(filename), newBasename);
}
export function debounce(fn, time) {
    let timer;
    function debounced() {
        clearTimeout(timer);
        timer = setTimeout(fn, time);
    }
    debounced.flush = () => {
        clearTimeout(timer);
        fn();
    };
    return debounced;
}
