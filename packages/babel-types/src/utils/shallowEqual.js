export default function shallowEqual(actual, expected) {
    const keys = Object.keys(expected);
    for (const key of keys) {
        if (
        // @ts-expect-error maybe we should check whether key exists first
        actual[key] !== expected[key]) {
            return false;
        }
    }
    return true;
}
