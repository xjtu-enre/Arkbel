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
function shouldsetError(name, code){
  it(name, () => {
    expect(() =>
      parse(code, { sourceType: "module", plugins: ["arkts", "decorators"] }),
    ).toThrow();
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
    "ForEach try",
    "struct A { build() { Column() { ForEach(this,(item:string)=>{ Row(){} },(item:number)=>item) }}}",
  );
  shouldParse(
    "LazyForEach try",
    "struct A { a:s=new s();build() { Column() { LazyForEach(this.a,(item:string)=>{ Row(){} },item=>item) }}}",
  );
  shouldParse(
    "export default try",
    "@Component export default struct A { build() {}}",
  );
  shouldParse(
    "export default try 2",
    "@Custom export default struct Inte{ build(){}}",
  );
  shouldParse(
    "export try 0",
    "export struct A { build() {}}",
  );
  shouldParse(
    "export try",
    "@Component export struct A { build() {}}",
  );
  shouldParse(
    "export try 2",
    "@Entry @Component export struct A { build() {}}",
  );
  shouldParse(
    "this token in build() body",
    "@Component struct A { a;build(){ this.a}}",
  );
  shouldParse(
    "this token case 2",
    "@Component struct A{build(){this.b Clo(){}}}",
  );
  shouldParse(
    "this token case 3",
    "@Component struct A{build(){Text(){} this.a }}",
  );
  shouldParse(
    "this token in a trailingClosure body",
    "@Component struct A { a;build(){ Row(){this.a}}}",
  );
  shouldParse(
    "stateStyles property without brace use this",
    "struct Foo{a();build(){Column().stateStyles({f:this.a})}}",
  );
  shouldParse(
    "stateStyles may appears in TS",
    "struct Foo{build(){Column().stateStyles({f:height(100)})}}",
  );
  shouldsetError(
    "stateStyles false case to be fail",
    "struct Foo{build(){Column().stateStyles({f:{height(100)}})}}",
  );
  shouldParse(
    "stateStyles property case 2 with {.}",
    "struct Foo{build(){Column().stateStyles({f:{.height(100)}})}}",
  );
  shouldParse(
    "import in ArkTS",
    "import * as all from './export' ",
  );
  shouldParse(
    "@Builder Decorate Function in top space",
    "@Builder function Foo(a:string){Row(){}}",
  );
  shouldParse(
    "@Builder Decorate Function in a struct",
    "struct A{@Builder Foo(a:string){Row(){}.h(100)}}",
  );
  shouldParse(
    "@Builderparam Decorate property use function in top space",
    "@Builder function f() {} struct A{@BuilderParam a: () => void = f;}",
  );
  shouldParse(
    "@Builderparam Decorate property use function in struct",
    "struct A{@Builder f() {} @BuilderParam a: () => void = this.f;}",
  );
  shouldParse(
    "@Extend Decorate Function in the top space",
    "@Extend(Text) function Foo(a:number){.setsize(a)}",
  );
  shouldParse(
    "@Styles Decorate Function in top space",
    "@Styles function Foo(){.setsize(2)}",
  );
  shouldParse(
    "@Styles Decorate Function in a struct",
    "@Component struct A{@Styles a(){.h(10)}}",
  );

  // shouldParse(
  //   "if statement in closure",
  //   "struct A { build() { Column('a') { Text('b') if (true) { Text('b') } } } }",
  // );
  //
  // shouldParse(
  //   "if else statement in closure",
  //   "struct A { build() { Column('a') { if (true) { Text('b') } else if (true) { Text('c') } else { Text('d') } } } }",
  // );
  shouldParse(
    "A true case in ArkTS",
    "@Component\n" +
      "struct Foo {\n" +
      "  build() {\n" +
      "    Text('ArkTS')\n" +
      "      .stateStyles({\n" +
      "        normal: this.normalStyle,\n" +
      "        pressed: this.pressedStyle,\n" +
      "        focused: this.focusedStyle,\n" +
      "        disabled: this.disabledStyle,\n" +
      "      })\n" +
      "  }\n" +
      "}",
  );
});
