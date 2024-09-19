import originalPlugins from "@babel/compat-data/plugins";
import originalPluginsBugfixes from "@babel/compat-data/plugin-bugfixes";
import originalOverlappingPlugins from "@babel/compat-data/overlapping-plugins";
import availablePlugins from "./available-plugins.ts";
const keys = Object.keys;
export const plugins = filterAvailable(originalPlugins);
export const pluginsBugfixes = filterAvailable(originalPluginsBugfixes);
export const overlappingPlugins = filterAvailable(originalOverlappingPlugins);
// @ts-expect-error: we extend this here, since it's a syntax plugin and thus
// doesn't make sense to store it in a compat-data package.
overlappingPlugins["syntax-import-attributes"] = ["syntax-import-assertions"];
function filterAvailable(data) {
    const result = {};
    for (const plugin of keys(data)) {
        if (Object.hasOwnProperty.call(availablePlugins, plugin)) {
            result[plugin] = data[plugin];
        }
    }
    return result;
}
