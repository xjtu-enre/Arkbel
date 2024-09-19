import { Position } from "../util/location.ts";
import { types as ct } from "./context.ts";
import { tt } from "./types.ts";
var StateFlags;
(function (StateFlags) {
    StateFlags[StateFlags["None"] = 0] = "None";
    StateFlags[StateFlags["Strict"] = 1] = "Strict";
    StateFlags[StateFlags["maybeInArrowParameters"] = 2] = "maybeInArrowParameters";
    StateFlags[StateFlags["inType"] = 4] = "inType";
    StateFlags[StateFlags["noAnonFunctionType"] = 8] = "noAnonFunctionType";
    StateFlags[StateFlags["hasFlowComment"] = 16] = "hasFlowComment";
    StateFlags[StateFlags["isAmbientContext"] = 32] = "isAmbientContext";
    StateFlags[StateFlags["inAbstractClass"] = 64] = "inAbstractClass";
    StateFlags[StateFlags["inDisallowConditionalTypesContext"] = 128] = "inDisallowConditionalTypesContext";
    StateFlags[StateFlags["soloAwait"] = 256] = "soloAwait";
    StateFlags[StateFlags["inFSharpPipelineDirectBody"] = 512] = "inFSharpPipelineDirectBody";
    StateFlags[StateFlags["canStartJSXElement"] = 1024] = "canStartJSXElement";
    StateFlags[StateFlags["containsEsc"] = 2048] = "containsEsc";
})(StateFlags || (StateFlags = {}));
export var LoopLabelKind;
(function (LoopLabelKind) {
    LoopLabelKind[LoopLabelKind["Loop"] = 1] = "Loop";
    LoopLabelKind[LoopLabelKind["Switch"] = 2] = "Switch";
})(LoopLabelKind || (LoopLabelKind = {}));
export default class State {
    flags = StateFlags.canStartJSXElement;
    get strict() {
        return (this.flags & StateFlags.Strict) > 0;
    }
    set strict(value) {
        if (value) {
            this.flags |= StateFlags.Strict;
        }
        else {
            this.flags &= ~StateFlags.Strict;
        }
    }
    curLine;
    lineStart;
    // And, if locations are used, the {line, column} object
    // corresponding to those offsets
    startLoc;
    endLoc;
    init({ strictMode, sourceType, startLine, startColumn }) {
        this.strict =
            strictMode === false
                ? false
                : strictMode === true
                    ? true
                    : sourceType === "module";
        this.curLine = startLine;
        this.lineStart = -startColumn;
        this.startLoc = this.endLoc = new Position(startLine, startColumn, 0);
    }
    errors = [];
    // Used to signify the start of a potential arrow function
    potentialArrowAt = -1;
    // Used to signify the start of an expression which looks like a
    // typed arrow function, but it isn't
    // e.g. a ? (b) : c => d
    //          ^
    noArrowAt = [];
    // Used to signify the start of an expression whose params, if it looks like
    // an arrow function, shouldn't be converted to assignable nodes.
    // This is used to defer the validation of typed arrow functions inside
    // conditional expressions.
    // e.g. a ? (b) : c => d
    //          ^
    noArrowParamsConversionAt = [];
    // Flags to track
    get maybeInArrowParameters() {
        return (this.flags & StateFlags.maybeInArrowParameters) > 0;
    }
    set maybeInArrowParameters(value) {
        if (value) {
            this.flags |= StateFlags.maybeInArrowParameters;
        }
        else {
            this.flags &= ~StateFlags.maybeInArrowParameters;
        }
    }
    get inType() {
        return (this.flags & StateFlags.inType) > 0;
    }
    set inType(value) {
        if (value) {
            this.flags |= StateFlags.inType;
        }
        else {
            this.flags &= ~StateFlags.inType;
        }
    }
    get noAnonFunctionType() {
        return (this.flags & StateFlags.noAnonFunctionType) > 0;
    }
    set noAnonFunctionType(value) {
        if (value) {
            this.flags |= StateFlags.noAnonFunctionType;
        }
        else {
            this.flags &= ~StateFlags.noAnonFunctionType;
        }
    }
    get hasFlowComment() {
        return (this.flags & StateFlags.hasFlowComment) > 0;
    }
    set hasFlowComment(value) {
        if (value) {
            this.flags |= StateFlags.hasFlowComment;
        }
        else {
            this.flags &= ~StateFlags.hasFlowComment;
        }
    }
    get isAmbientContext() {
        return (this.flags & StateFlags.isAmbientContext) > 0;
    }
    set isAmbientContext(value) {
        if (value) {
            this.flags |= StateFlags.isAmbientContext;
        }
        else {
            this.flags &= ~StateFlags.isAmbientContext;
        }
    }
    get inAbstractClass() {
        return (this.flags & StateFlags.inAbstractClass) > 0;
    }
    set inAbstractClass(value) {
        if (value) {
            this.flags |= StateFlags.inAbstractClass;
        }
        else {
            this.flags &= ~StateFlags.inAbstractClass;
        }
    }
    get inDisallowConditionalTypesContext() {
        return (this.flags & StateFlags.inDisallowConditionalTypesContext) > 0;
    }
    set inDisallowConditionalTypesContext(value) {
        if (value) {
            this.flags |= StateFlags.inDisallowConditionalTypesContext;
        }
        else {
            this.flags &= ~StateFlags.inDisallowConditionalTypesContext;
        }
    }
    // For the Hack-style pipelines plugin
    topicContext = {
        maxNumOfResolvableTopics: 0,
        maxTopicIndex: null,
    };
    // For the F#-style pipelines plugin
    get soloAwait() {
        return (this.flags & StateFlags.soloAwait) > 0;
    }
    set soloAwait(value) {
        if (value) {
            this.flags |= StateFlags.soloAwait;
        }
        else {
            this.flags &= ~StateFlags.soloAwait;
        }
    }
    get inFSharpPipelineDirectBody() {
        return (this.flags & StateFlags.inFSharpPipelineDirectBody) > 0;
    }
    set inFSharpPipelineDirectBody(value) {
        if (value) {
            this.flags |= StateFlags.inFSharpPipelineDirectBody;
        }
        else {
            this.flags &= ~StateFlags.inFSharpPipelineDirectBody;
        }
    }
    // Labels in scope.
    labels = [];
    commentsLen = 0;
    // Comment attachment store
    commentStack = [];
    // The current position of the tokenizer in the input.
    pos = 0;
    // Properties of the current token:
    // Its type
    type = tt.eof;
    // For tokens that include more information than their type, the value
    value = null;
    // Its start and end offset
    start = 0;
    end = 0;
    // Position information for the previous token
    // this is initialized when generating the second token.
    lastTokEndLoc = null;
    // this is initialized when generating the second token.
    lastTokStartLoc = null;
    // The context stack is used to track whether the apostrophe "`" starts
    // or ends a string template
    context = [ct.brace];
    // Used to track whether a JSX element is allowed to form
    get canStartJSXElement() {
        return (this.flags & StateFlags.canStartJSXElement) > 0;
    }
    set canStartJSXElement(value) {
        if (value) {
            this.flags |= StateFlags.canStartJSXElement;
        }
        else {
            this.flags &= ~StateFlags.canStartJSXElement;
        }
    }
    // Used to signal to callers of `readWord1` whether the word
    // contained any escape sequences. This is needed because words with
    // escape sequences must not be interpreted as keywords.
    get containsEsc() {
        return (this.flags & StateFlags.containsEsc) > 0;
    }
    set containsEsc(value) {
        if (value) {
            this.flags |= StateFlags.containsEsc;
        }
        else {
            this.flags &= ~StateFlags.containsEsc;
        }
    }
    // Used to track invalid escape sequences in template literals,
    // that must be reported if the template is not tagged.
    firstInvalidTemplateEscapePos = null;
    // This property is used to track the following errors
    // - StrictNumericEscape
    // - StrictOctalLiteral
    //
    // in a literal that occurs prior to/immediately after a "use strict" directive.
    // todo(JLHwung): set strictErrors to null and avoid recording string errors
    // after a non-directive is parsed
    strictErrors = new Map();
    // Tokens length in token store
    tokensLength = 0;
    /**
     * When we add a new property, we must manually update the `clone` method
     * @see State#clone
     */
    curPosition() {
        return new Position(this.curLine, this.pos - this.lineStart, this.pos);
    }
    clone() {
        const state = new State();
        state.flags = this.flags;
        state.curLine = this.curLine;
        state.lineStart = this.lineStart;
        state.startLoc = this.startLoc;
        state.endLoc = this.endLoc;
        state.errors = this.errors.slice();
        state.potentialArrowAt = this.potentialArrowAt;
        state.noArrowAt = this.noArrowAt.slice();
        state.noArrowParamsConversionAt = this.noArrowParamsConversionAt.slice();
        state.topicContext = this.topicContext;
        state.labels = this.labels.slice();
        state.commentsLen = this.commentsLen;
        state.commentStack = this.commentStack.slice();
        state.pos = this.pos;
        state.type = this.type;
        state.value = this.value;
        state.start = this.start;
        state.end = this.end;
        state.lastTokEndLoc = this.lastTokEndLoc;
        state.lastTokStartLoc = this.lastTokStartLoc;
        state.context = this.context.slice();
        state.firstInvalidTemplateEscapePos = this.firstInvalidTemplateEscapePos;
        state.strictErrors = this.strictErrors;
        state.tokensLength = this.tokensLength;
        return state;
    }
}
