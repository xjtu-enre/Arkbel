// The token context is used in JSX plugin to track
// jsx tag / jsx text / normal JavaScript expression
export class TokContext {
    constructor(token, preserveSpace) {
        this.token = token;
        this.preserveSpace = !!preserveSpace;
    }
    token;
    preserveSpace;
}
const types = {
    brace: new TokContext("{"), // normal JavaScript expression
    j_oTag: new TokContext("<tag"), // JSX opening tag
    j_cTag: new TokContext("</tag"), // JSX closing tag
    j_expr: new TokContext("<tag>...</tag>", true), // JSX expressions
};
if (!process.env.BABEL_8_BREAKING) {
    types.template = new TokContext("`", true);
}
export { types };
