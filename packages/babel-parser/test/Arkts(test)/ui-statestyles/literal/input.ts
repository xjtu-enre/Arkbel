@Component
struct Foo {
  build() {
    Button('Button1')
      .stateStyles({
        focused: {
          .backgroundColor(Color.Pink)
        },
        pressed: {
          .backgroundColor(Color.Red)
        },
        normal: {
          .backgroundColor(Color.Blue)
        },
        disabled: {
          .backgroundColor(Color.Gray)
        },
      })
  }
}
