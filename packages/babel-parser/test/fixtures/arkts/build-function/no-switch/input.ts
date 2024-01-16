@Component
struct Foo {
  build() {
    Column() {
      switch (expression) {
        case 1:
          Text('1')
          break;
        default:
          Text('default')
          break;
      }
    }
  }
}
