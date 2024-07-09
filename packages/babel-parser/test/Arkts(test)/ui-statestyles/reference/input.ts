@Component
struct Foo {
  build() {
    Text('ArkTS')
      .stateStyles({
        normal: this.normalStyle,
        pressed: this.pressedStyle,
        focused: this.focusedStyle,
        disabled: this.disabledStyle,
      })
  }
}
