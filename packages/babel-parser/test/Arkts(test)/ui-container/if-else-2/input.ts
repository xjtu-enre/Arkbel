@Component
struct Foo {
  build() {
    if (true) {
      Text('ArkTS')
        .fontColor(Color.Green)
    } else if (true) {
      Text('ArkTS')
        .fontColor(Color.Red)
    } else {
      Text('ArkTS')
        .fontColor(Color.Blue)
    }
  }
}
