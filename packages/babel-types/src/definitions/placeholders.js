import { ALIAS_KEYS } from "./utils.ts";
export const PLACEHOLDERS = [
    "Identifier",
    "StringLiteral",
    "Expression",
    "Statement",
    "Declaration",
    "BlockStatement",
    "ClassBody",
    "Pattern",
];
export const PLACEHOLDERS_ALIAS = {
    Declaration: ["Statement"],
    Pattern: ["PatternLike", "LVal"],
};
for (const type of PLACEHOLDERS) {
    const alias = ALIAS_KEYS[type];
    if (alias?.length)
        PLACEHOLDERS_ALIAS[type] = alias;
}
export const PLACEHOLDERS_FLIPPED_ALIAS = {};
Object.keys(PLACEHOLDERS_ALIAS).forEach(type => {
    PLACEHOLDERS_ALIAS[type].forEach(alias => {
        if (!Object.hasOwnProperty.call(PLACEHOLDERS_FLIPPED_ALIAS, alias)) {
            PLACEHOLDERS_FLIPPED_ALIAS[alias] = [];
        }
        PLACEHOLDERS_FLIPPED_ALIAS[alias].push(type);
    });
});
