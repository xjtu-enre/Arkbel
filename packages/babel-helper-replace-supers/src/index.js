import environmentVisitor from "@babel/helper-environment-visitor";
import memberExpressionToFunctions from "@babel/helper-member-expression-to-functions";
import optimiseCall from "@babel/helper-optimise-call-expression";
import { traverse, template, types as t } from "@babel/core";
const { assignmentExpression, booleanLiteral, callExpression, cloneNode, identifier, memberExpression, sequenceExpression, stringLiteral, thisExpression, } = t;
if (!process.env.BABEL_8_BREAKING && !USE_ESM && !IS_STANDALONE) {
    // eslint-disable-next-line no-restricted-globals
    const ns = require("@babel/helper-environment-visitor");
    // eslint-disable-next-line no-restricted-globals
    exports.environmentVisitor = ns.default;
    // eslint-disable-next-line no-restricted-globals
    exports.skipAllButComputedKey = ns.skipAllButComputedKey;
}
/**
 * Creates an expression which result is the proto of objectRef.
 *
 * @example <caption>isStatic === true</caption>
 *
 *   helpers.getPrototypeOf(CLASS)
 *
 * @example <caption>isStatic === false</caption>
 *
 *   helpers.getPrototypeOf(CLASS.prototype)
 */
function getPrototypeOfExpression(objectRef, isStatic, file, isPrivateMethod) {
    objectRef = cloneNode(objectRef);
    const targetRef = isStatic || isPrivateMethod
        ? objectRef
        : memberExpression(objectRef, identifier("prototype"));
    return callExpression(file.addHelper("getPrototypeOf"), [targetRef]);
}
const visitor = traverse.visitors.merge([
    environmentVisitor,
    {
        Super(path, state) {
            const { node, parentPath } = path;
            if (!parentPath.isMemberExpression({ object: node }))
                return;
            state.handle(parentPath);
        },
    },
]);
const unshadowSuperBindingVisitor = traverse.visitors.merge([
    environmentVisitor,
    {
        Scopable(path, { refName }) {
            // https://github.com/Zzzen/babel/pull/1#pullrequestreview-564833183
            const binding = path.scope.getOwnBinding(refName);
            if (binding && binding.identifier.name === refName) {
                path.scope.rename(refName);
            }
        },
    },
]);
const specHandlers = {
    memoise(superMember, count) {
        const { scope, node } = superMember;
        const { computed, property } = node;
        if (!computed) {
            return;
        }
        const memo = scope.maybeGenerateMemoised(property);
        if (!memo) {
            return;
        }
        this.memoiser.set(property, memo, count);
    },
    prop(superMember) {
        const { computed, property } = superMember.node;
        if (this.memoiser.has(property)) {
            return cloneNode(this.memoiser.get(property));
        }
        if (computed) {
            return cloneNode(property);
        }
        return stringLiteral(property.name);
    },
    get(superMember) {
        return this._get(superMember, this._getThisRefs());
    },
    _get(superMember, thisRefs) {
        const proto = getPrototypeOfExpression(this.getObjectRef(), this.isStatic, this.file, this.isPrivateMethod);
        return callExpression(this.file.addHelper("get"), [
            // @ts-expect-error memo does not exist when this.isDerivedConstructor is false
            thisRefs.memo ? sequenceExpression([thisRefs.memo, proto]) : proto,
            this.prop(superMember),
            thisRefs.this,
        ]);
    },
    _getThisRefs() {
        if (!this.isDerivedConstructor) {
            return { this: thisExpression() };
        }
        const thisRef = this.scope.generateDeclaredUidIdentifier("thisSuper");
        return {
            memo: assignmentExpression("=", thisRef, thisExpression()),
            this: cloneNode(thisRef),
        };
    },
    set(superMember, value) {
        const thisRefs = this._getThisRefs();
        const proto = getPrototypeOfExpression(this.getObjectRef(), this.isStatic, this.file, this.isPrivateMethod);
        return callExpression(this.file.addHelper("set"), [
            // @ts-expect-error memo does not exist when this.isDerivedConstructor is false
            thisRefs.memo ? sequenceExpression([thisRefs.memo, proto]) : proto,
            this.prop(superMember),
            value,
            thisRefs.this,
            booleanLiteral(superMember.isInStrictMode()),
        ]);
    },
    destructureSet(superMember) {
        throw superMember.buildCodeFrameError(`Destructuring to a super field is not supported yet.`);
    },
    call(superMember, args) {
        const thisRefs = this._getThisRefs();
        return optimiseCall(this._get(superMember, thisRefs), cloneNode(thisRefs.this), args, false);
    },
    optionalCall(superMember, args) {
        const thisRefs = this._getThisRefs();
        return optimiseCall(this._get(superMember, thisRefs), cloneNode(thisRefs.this), args, true);
    },
    delete(superMember) {
        if (superMember.node.computed) {
            return sequenceExpression([
                callExpression(this.file.addHelper("toPropertyKey"), [
                    cloneNode(superMember.node.property),
                ]),
                template.expression.ast `
          function () { throw new ReferenceError("'delete super[expr]' is invalid"); }()
        `,
            ]);
        }
        else {
            return template.expression.ast `
        function () { throw new ReferenceError("'delete super.prop' is invalid"); }()
      `;
        }
    },
};
const looseHandlers = {
    ...specHandlers,
    prop(superMember) {
        const { property } = superMember.node;
        if (this.memoiser.has(property)) {
            return cloneNode(this.memoiser.get(property));
        }
        return cloneNode(property);
    },
    get(superMember) {
        const { isStatic, getSuperRef } = this;
        const { computed } = superMember.node;
        const prop = this.prop(superMember);
        let object;
        if (isStatic) {
            object =
                getSuperRef() ??
                    memberExpression(identifier("Function"), identifier("prototype"));
        }
        else {
            object = memberExpression(getSuperRef() ?? identifier("Object"), identifier("prototype"));
        }
        return memberExpression(object, prop, computed);
    },
    set(superMember, value) {
        const { computed } = superMember.node;
        const prop = this.prop(superMember);
        return assignmentExpression("=", memberExpression(thisExpression(), prop, computed), value);
    },
    destructureSet(superMember) {
        const { computed } = superMember.node;
        const prop = this.prop(superMember);
        return memberExpression(thisExpression(), prop, computed);
    },
    call(superMember, args) {
        return optimiseCall(this.get(superMember), thisExpression(), args, false);
    },
    optionalCall(superMember, args) {
        return optimiseCall(this.get(superMember), thisExpression(), args, true);
    },
};
export default class ReplaceSupers {
    constructor(opts) {
        const path = opts.methodPath;
        this.methodPath = path;
        this.isDerivedConstructor =
            path.isClassMethod({ kind: "constructor" }) && !!opts.superRef;
        this.isStatic =
            path.isObjectMethod() ||
                // @ts-expect-error static is not in ClassPrivateMethod
                path.node.static ||
                path.isStaticBlock?.();
        this.isPrivateMethod = path.isPrivate() && path.isMethod();
        this.file = opts.file;
        this.constantSuper = process.env.BABEL_8_BREAKING
            ? opts.constantSuper
            : // Fallback to isLoose for backward compatibility
                opts.constantSuper ?? opts.isLoose;
        this.opts = opts;
    }
    getObjectRef() {
        return cloneNode(this.opts.objectRef || this.opts.getObjectRef());
    }
    getSuperRef() {
        if (this.opts.superRef)
            return cloneNode(this.opts.superRef);
        if (this.opts.getSuperRef) {
            return cloneNode(this.opts.getSuperRef());
        }
    }
    replace() {
        // https://github.com/babel/babel/issues/11994
        if (this.opts.refToPreserve) {
            this.methodPath.traverse(unshadowSuperBindingVisitor, {
                refName: this.opts.refToPreserve.name,
            });
        }
        const handler = this.constantSuper ? looseHandlers : specHandlers;
        memberExpressionToFunctions(this.methodPath, visitor, {
            file: this.file,
            scope: this.methodPath.scope,
            isDerivedConstructor: this.isDerivedConstructor,
            isStatic: this.isStatic,
            isPrivateMethod: this.isPrivateMethod,
            getObjectRef: this.getObjectRef.bind(this),
            getSuperRef: this.getSuperRef.bind(this),
            // we dont need boundGet here, but memberExpressionToFunctions handler needs it.
            boundGet: handler.get,
            ...handler,
        });
    }
}
