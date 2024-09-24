import shell from "shelljs";
shell.exec("tsc");
shell.exec(
  "robocopy ./dist/packages/babel-types/src ./packages/babel-types/lib /E"
);
shell.exec(
  "robocopy ./dist/packages/babel-traverse/src ./packages/babel-traverse/lib /E"
);
shell.exec(
  "robocopy ./dist/packages/babel-parser/src ./packages/babel-parser/lib /E"
);
