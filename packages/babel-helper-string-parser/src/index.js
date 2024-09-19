import * as charCodes from "charcodes";
// The following character codes are forbidden from being
// an immediate sibling of NumericLiteralSeparator _
const forbiddenNumericSeparatorSiblings = {
    decBinOct: new Set([
        charCodes.dot,
        charCodes.uppercaseB,
        charCodes.uppercaseE,
        charCodes.uppercaseO,
        charCodes.underscore, // multiple separators are not allowed
        charCodes.lowercaseB,
        charCodes.lowercaseE,
        charCodes.lowercaseO,
    ]),
    hex: new Set([
        charCodes.dot,
        charCodes.uppercaseX,
        charCodes.underscore, // multiple separators are not allowed
        charCodes.lowercaseX,
    ]),
};
const isAllowedNumericSeparatorSibling = {
    // 0 - 1
    bin: (ch) => ch === charCodes.digit0 || ch === charCodes.digit1,
    // 0 - 7
    oct: (ch) => ch >= charCodes.digit0 && ch <= charCodes.digit7,
    // 0 - 9
    dec: (ch) => ch >= charCodes.digit0 && ch <= charCodes.digit9,
    // 0 - 9, A - F, a - f,
    hex: (ch) => (ch >= charCodes.digit0 && ch <= charCodes.digit9) ||
        (ch >= charCodes.uppercaseA && ch <= charCodes.uppercaseF) ||
        (ch >= charCodes.lowercaseA && ch <= charCodes.lowercaseF),
};
export function readStringContents(type, input, pos, lineStart, curLine, errors) {
    const initialPos = pos;
    const initialLineStart = lineStart;
    const initialCurLine = curLine;
    let out = "";
    let firstInvalidLoc = null;
    let chunkStart = pos;
    const { length } = input;
    for (;;) {
        if (pos >= length) {
            errors.unterminated(initialPos, initialLineStart, initialCurLine);
            out += input.slice(chunkStart, pos);
            break;
        }
        const ch = input.charCodeAt(pos);
        if (isStringEnd(type, ch, input, pos)) {
            out += input.slice(chunkStart, pos);
            break;
        }
        if (ch === charCodes.backslash) {
            out += input.slice(chunkStart, pos);
            const res = readEscapedChar(input, pos, lineStart, curLine, type === "template", errors);
            if (res.ch === null && !firstInvalidLoc) {
                firstInvalidLoc = { pos, lineStart, curLine };
            }
            else {
                out += res.ch;
            }
            ({ pos, lineStart, curLine } = res);
            chunkStart = pos;
        }
        else if (ch === charCodes.lineSeparator ||
            ch === charCodes.paragraphSeparator) {
            ++pos;
            ++curLine;
            lineStart = pos;
        }
        else if (ch === charCodes.lineFeed || ch === charCodes.carriageReturn) {
            if (type === "template") {
                out += input.slice(chunkStart, pos) + "\n";
                ++pos;
                if (ch === charCodes.carriageReturn &&
                    input.charCodeAt(pos) === charCodes.lineFeed) {
                    ++pos;
                }
                ++curLine;
                chunkStart = lineStart = pos;
            }
            else {
                errors.unterminated(initialPos, initialLineStart, initialCurLine);
            }
        }
        else {
            ++pos;
        }
    }
    return process.env.BABEL_8_BREAKING
        ? { pos, str: out, firstInvalidLoc, lineStart, curLine }
        : {
            pos,
            str: out,
            firstInvalidLoc,
            lineStart,
            curLine,
            containsInvalid: !!firstInvalidLoc,
        };
}
function isStringEnd(type, ch, input, pos) {
    if (type === "template") {
        return (ch === charCodes.graveAccent ||
            (ch === charCodes.dollarSign &&
                input.charCodeAt(pos + 1) === charCodes.leftCurlyBrace));
    }
    return (ch === (type === "double" ? charCodes.quotationMark : charCodes.apostrophe));
}
function readEscapedChar(input, pos, lineStart, curLine, inTemplate, errors) {
    const throwOnInvalid = !inTemplate;
    pos++; // skip '\'
    const res = (ch) => ({ pos, ch, lineStart, curLine });
    const ch = input.charCodeAt(pos++);
    switch (ch) {
        case charCodes.lowercaseN:
            return res("\n");
        case charCodes.lowercaseR:
            return res("\r");
        case charCodes.lowercaseX: {
            let code;
            ({ code, pos } = readHexChar(input, pos, lineStart, curLine, 2, false, throwOnInvalid, errors));
            return res(code === null ? null : String.fromCharCode(code));
        }
        case charCodes.lowercaseU: {
            let code;
            ({ code, pos } = readCodePoint(input, pos, lineStart, curLine, throwOnInvalid, errors));
            return res(code === null ? null : String.fromCodePoint(code));
        }
        case charCodes.lowercaseT:
            return res("\t");
        case charCodes.lowercaseB:
            return res("\b");
        case charCodes.lowercaseV:
            return res("\u000b");
        case charCodes.lowercaseF:
            return res("\f");
        case charCodes.carriageReturn:
            if (input.charCodeAt(pos) === charCodes.lineFeed) {
                ++pos;
            }
        // fall through
        case charCodes.lineFeed:
            lineStart = pos;
            ++curLine;
        // fall through
        case charCodes.lineSeparator:
        case charCodes.paragraphSeparator:
            return res("");
        case charCodes.digit8:
        case charCodes.digit9:
            if (inTemplate) {
                return res(null);
            }
            else {
                errors.strictNumericEscape(pos - 1, lineStart, curLine);
            }
        // fall through
        default:
            if (ch >= charCodes.digit0 && ch <= charCodes.digit7) {
                const startPos = pos - 1;
                const match = input.slice(startPos, pos + 2).match(/^[0-7]+/);
                let octalStr = match[0];
                let octal = parseInt(octalStr, 8);
                if (octal > 255) {
                    octalStr = octalStr.slice(0, -1);
                    octal = parseInt(octalStr, 8);
                }
                pos += octalStr.length - 1;
                const next = input.charCodeAt(pos);
                if (octalStr !== "0" ||
                    next === charCodes.digit8 ||
                    next === charCodes.digit9) {
                    if (inTemplate) {
                        return res(null);
                    }
                    else {
                        errors.strictNumericEscape(startPos, lineStart, curLine);
                    }
                }
                return res(String.fromCharCode(octal));
            }
            return res(String.fromCharCode(ch));
    }
}
// Used to read character escape sequences ('\x', '\u').
function readHexChar(input, pos, lineStart, curLine, len, forceLen, throwOnInvalid, errors) {
    const initialPos = pos;
    let n;
    ({ n, pos } = readInt(input, pos, lineStart, curLine, 16, len, forceLen, false, errors, 
    /* bailOnError */ !throwOnInvalid));
    if (n === null) {
        if (throwOnInvalid) {
            errors.invalidEscapeSequence(initialPos, lineStart, curLine);
        }
        else {
            pos = initialPos - 1;
        }
    }
    return { code: n, pos };
}
export function readInt(input, pos, lineStart, curLine, radix, len, forceLen, allowNumSeparator, errors, bailOnError) {
    const start = pos;
    const forbiddenSiblings = radix === 16
        ? forbiddenNumericSeparatorSiblings.hex
        : forbiddenNumericSeparatorSiblings.decBinOct;
    const isAllowedSibling = radix === 16
        ? isAllowedNumericSeparatorSibling.hex
        : radix === 10
            ? isAllowedNumericSeparatorSibling.dec
            : radix === 8
                ? isAllowedNumericSeparatorSibling.oct
                : isAllowedNumericSeparatorSibling.bin;
    let invalid = false;
    let total = 0;
    for (let i = 0, e = len == null ? Infinity : len; i < e; ++i) {
        const code = input.charCodeAt(pos);
        let val;
        if (code === charCodes.underscore && allowNumSeparator !== "bail") {
            const prev = input.charCodeAt(pos - 1);
            const next = input.charCodeAt(pos + 1);
            if (!allowNumSeparator) {
                if (bailOnError)
                    return { n: null, pos };
                errors.numericSeparatorInEscapeSequence(pos, lineStart, curLine);
            }
            else if (Number.isNaN(next) ||
                !isAllowedSibling(next) ||
                forbiddenSiblings.has(prev) ||
                forbiddenSiblings.has(next)) {
                if (bailOnError)
                    return { n: null, pos };
                errors.unexpectedNumericSeparator(pos, lineStart, curLine);
            }
            // Ignore this _ character
            ++pos;
            continue;
        }
        if (code >= charCodes.lowercaseA) {
            val = code - charCodes.lowercaseA + charCodes.lineFeed;
        }
        else if (code >= charCodes.uppercaseA) {
            val = code - charCodes.uppercaseA + charCodes.lineFeed;
        }
        else if (charCodes.isDigit(code)) {
            val = code - charCodes.digit0; // 0-9
        }
        else {
            val = Infinity;
        }
        if (val >= radix) {
            // If we found a digit which is too big, errors.invalidDigit can return true to avoid
            // breaking the loop (this is used for error recovery).
            if (val <= 9 && bailOnError) {
                return { n: null, pos };
            }
            else if (val <= 9 &&
                errors.invalidDigit(pos, lineStart, curLine, radix)) {
                val = 0;
            }
            else if (forceLen) {
                val = 0;
                invalid = true;
            }
            else {
                break;
            }
        }
        ++pos;
        total = total * radix + val;
    }
    if (pos === start || (len != null && pos - start !== len) || invalid) {
        return { n: null, pos };
    }
    return { n: total, pos };
}
export function readCodePoint(input, pos, lineStart, curLine, throwOnInvalid, errors) {
    const ch = input.charCodeAt(pos);
    let code;
    if (ch === charCodes.leftCurlyBrace) {
        ++pos;
        ({ code, pos } = readHexChar(input, pos, lineStart, curLine, input.indexOf("}", pos) - pos, true, throwOnInvalid, errors));
        ++pos;
        if (code !== null && code > 0x10ffff) {
            if (throwOnInvalid) {
                errors.invalidCodePoint(pos, lineStart, curLine);
            }
            else {
                return { code: null, pos };
            }
        }
    }
    else {
        ({ code, pos } = readHexChar(input, pos, lineStart, curLine, 4, false, throwOnInvalid, errors));
    }
    return { code, pos };
}
