@Component
struct Foo {
  build() {
    this.foo > 0 ? Text('A') : Text('B')
  }
}
