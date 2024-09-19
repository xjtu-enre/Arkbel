export function finalize(deepArr) {
    return Object.freeze(deepArr);
}
export function flattenToSet(arr) {
    const result = new Set();
    const stack = [arr];
    while (stack.length > 0) {
        for (const el of stack.pop()) {
            if (Array.isArray(el))
                stack.push(el);
            else
                result.add(el);
        }
    }
    return result;
}
