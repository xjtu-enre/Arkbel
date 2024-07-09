@Component
struct Foo {
  build() {
    if (true) {
      Text('ArkTS')
        .fontColor(Color.Green)
      if (true) {
        Image('arkts.png')
      }
    }
  }
}
