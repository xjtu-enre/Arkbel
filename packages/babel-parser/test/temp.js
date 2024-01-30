import { parse } from "../lib/index.js";

function getParser(code) {
  return () =>
    parse(code, { sourceType: "module", plugins: ["arkts", "decorators"] });
}

function shouldParse(name, code) {
  it(name, () => {
    expect(getParser(code)()).toMatchSnapshot();
  });
}

describe("arkts", () => {
  shouldParse("simple struct", "struct A {}");

  shouldParse("decorated struct", "@component struct A {}");

  shouldParse("struct with build", "struct A { build() {} }");

  shouldParse("build simple call", "struct A { build() { Text('a') } }");

  shouldParse(
    "build simple trailing closure call",
    "struct A { build() { Column('a') { Text('b') } } }",
  );

  shouldParse(
    "build multiple trailing closure calls",
    "struct A { build() { Column('a') { Text('b').fontSize(20) Image('c.png') } } }",
  );

  shouldParse(
    "build trailing closure chaining call",
    "struct A { build() { Column('a') { Text('b') }.height(50) } }",
  );

  shouldParse(
    "if statement in closure",
    "struct A { build() { Column('a') { if (true) { Text('b') } } } }",
  );

  shouldParse(
    "if else statement in closure",
    "struct A { build() { Column('a') { if (true) { Text('b') } else if (true) { Text('c') } else { Text('d') } } } }",
  );
});
