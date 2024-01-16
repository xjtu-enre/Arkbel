@Component
struct Foo {
  build() {
    if (true) {
      Text('ArkTS')
        .fontColor(Color.Green)
    } else {
      Text('ArkTS')
        .fontColor(Color.Red)
    }
  }
}
