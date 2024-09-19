import { types as t } from "@babel/core";
export function pushAccessor(mutatorMap, node) {
    const alias = t.toKeyAlias(node);
    const map = (mutatorMap[alias] ??= {
        _inherits: [],
        _key: node.key,
    });
    map._inherits.push(node);
    const value = t.functionExpression(null, node.params, node.body, node.generator, node.async);
    value.returnType = node.returnType;
    t.inheritsComments(value, node);
    map[node.kind] = value;
    return map;
}
export function toDefineObject(mutatorMap) {
    const objExpr = t.objectExpression([]);
    Object.keys(mutatorMap).forEach(function (mutatorMapKey) {
        const map = mutatorMap[mutatorMapKey];
        map.configurable = t.booleanLiteral(true);
        map.enumerable = t.booleanLiteral(true);
        const mapNode = t.objectExpression([]);
        const propNode = t.objectProperty(map._key, mapNode, map._computed);
        Object.keys(map).forEach(function (key) {
            const node = map[key];
            if (key[0] === "_")
                return;
            const prop = t.objectProperty(t.identifier(key), node);
            t.inheritsComments(prop, node);
            t.removeComments(node);
            mapNode.properties.push(prop);
        });
        objExpr.properties.push(propNode);
    });
    return objExpr;
}
