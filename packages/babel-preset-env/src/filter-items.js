import semver from "semver";
import { minVersions } from "./available-plugins.ts";
const has = Function.call.bind(Object.hasOwnProperty);
export function addProposalSyntaxPlugins(items, proposalSyntaxPlugins) {
    proposalSyntaxPlugins.forEach(plugin => {
        items.add(plugin);
    });
}
export function removeUnnecessaryItems(items, overlapping) {
    items.forEach(item => {
        overlapping[item]?.forEach(name => items.delete(name));
    });
}
export function removeUnsupportedItems(items, babelVersion) {
    items.forEach(item => {
        if (has(minVersions, item) &&
            semver.lt(babelVersion, 
            // @ts-expect-error we have checked minVersions[item] in has call
            minVersions[item])) {
            items.delete(item);
        }
    });
}
