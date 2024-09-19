import fs from "fs";
import gensync from "gensync";
export const readFile = gensync({
    sync: fs.readFileSync,
    errback: fs.readFile,
});
export const stat = gensync({
    sync: fs.statSync,
    errback: fs.stat,
});
