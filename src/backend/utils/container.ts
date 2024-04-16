export default function dockerize(
  stack: string,
  port: string,
  build_cmds: string,
) {
  let dockerfile = "";
  build_cmds = build_cmds.replace(/\r?\n$/, '');
  const run_cmd = build_cmds.split("\n");
  const execute_cmd = "CMD " + JSON.stringify(run_cmd.pop()?.split(" "));
  const build_cmds_mapped = run_cmd.map((elem) => {
    return "RUN " + elem;
  }).join("\n");
  if (stack == "Python") {
    dockerfile =
      "FROM python:latest \nWORKDIR /app \nCOPY requirements.txt . \nRUN pip install --no-cache-dir -r requirements.txt \nCOPY . ." +
      build_cmds_mapped + `\nEXPOSE ${port}\n` + execute_cmd;
  } else if (stack == "NodeJS") {
    dockerfile =
      "FROM node:latest \nWORKDIR /app \nCOPY ./package*.json . \nRUN npm install \nCOPY . ." +
      build_cmds_mapped + `\nEXPOSE ${port} \n` + execute_cmd;
  }
  return dockerfile.toString();
}
