import { normalizeReplacements } from "./options.ts";
import parseAndBuildMetadata from "./parse.ts";
import populatePlaceholders from "./populate.ts";
export default function stringTemplate(formatter, code, opts) {
    code = formatter.code(code);
    let metadata;
    return (arg) => {
        const replacements = normalizeReplacements(arg);
        if (!metadata)
            metadata = parseAndBuildMetadata(formatter, code, opts);
        return formatter.unwrap(populatePlaceholders(metadata, replacements));
    };
}
