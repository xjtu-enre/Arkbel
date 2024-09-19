export default function isCompatTag(tagName) {
    // Must start with a lowercase ASCII letter
    return !!tagName && /^[a-z]/.test(tagName);
}
