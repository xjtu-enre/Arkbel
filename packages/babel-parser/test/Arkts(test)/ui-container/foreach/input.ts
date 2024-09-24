@Entry
@Component
struct Parent {
@State simpleList: Array<string> = ['one', 'two', 'three'];

  build() {
    Row() {
      Column() {
        ForEach(this.simpleList, (item: string) => {
          ChildItem({ item: item })
        }, (item: string) => item)
      }
    .width('100%')
        .height('100%')
    }
  .height('100%')
      .backgroundColor(0xF1F3F5)
  }
}

@Component
struct ChildItem {
@Prop item: string;

  build() {
    Text(this.item)
      .fontSize(50)
  }
}
