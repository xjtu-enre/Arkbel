import semver from "semver";
import { prettifyVersion } from "./pretty.ts";
import { semverify, isUnreleasedVersion, getLowestImplementedVersion, } from "./utils.ts";
export function getInclusionReasons(item, targetVersions, list) {
    const minVersions = list[item] || {};
    return Object.keys(targetVersions).reduce((result, env) => {
        const minVersion = getLowestImplementedVersion(minVersions, env);
        const targetVersion = targetVersions[env];
        if (!minVersion) {
            result[env] = prettifyVersion(targetVersion);
        }
        else {
            const minIsUnreleased = isUnreleasedVersion(minVersion, env);
            const targetIsUnreleased = isUnreleasedVersion(targetVersion, env);
            if (!targetIsUnreleased &&
                (minIsUnreleased ||
                    semver.lt(targetVersion.toString(), semverify(minVersion)))) {
                result[env] = prettifyVersion(targetVersion);
            }
        }
        return result;
    }, {});
}
