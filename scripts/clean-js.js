import shell from "shelljs";
import fs from "fs";
cleanjsfile();
function getFilename(filename) {
  return filename.substring(0, filename.lastIndexOf("."));
}
function getExtension(filename) {
  return filename.substring(filename.lastIndexOf(".") + 1);
}
/**
 * 递归遍历，获取指定文件夹下面的所有文件路径
 */
function clean(filePath) {
  const tsfile = [];
  if (fs.existsSync(filePath)) {
    const files = fs.readdirSync(filePath);
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; // 文件名称（不包含文件路径）（目录）
      const currentFilePath = filePath + "/" + file;
      const stats = fs.lstatSync(currentFilePath);
      if (stats.isDirectory()) {
        clean(currentFilePath);
      } else {
        if (getExtension(file) === "ts") tsfile.push(getFilename(file));
      }
    }
    for (const ts of tsfile) {
      const jsfile = filePath + "/" + ts + ".js";
      console.log(jsfile);
      shell.rm("-f", jsfile);
    }
  } else {
    console.warn(`指定的目录${filePath}不存在！`);
  }

  return true;
}
function cleanjsfile() {
  const filePath = "./packages";
  if (fs.existsSync(filePath)) {
    const files = fs.readdirSync(filePath);
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; // 文件名称（不包含文件路径）（目录）
      const currentFilePath = filePath + "/" + file;
      const stats = fs.lstatSync(currentFilePath);
      if (stats.isDirectory()) {
        const src = currentFilePath + "/" + "src";
        clean(src);
      }
    }
  } else {
    console.warn(`指定的目录${filePath}不存在！`);
  }
  console.log("finish");
}
