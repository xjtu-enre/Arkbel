export default function makeNoopPlugin() {
    let p;
    return ((p = (() => ({}))).default = p);
}
