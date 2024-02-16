export default function dockerize(
  stack: string,
  port: string,
  build_cmds: string,
) {
  let dockerfile = "";
  const run_cmd = build_cmds.split("\n");
  const execute_cmd = "CMD " + JSON.stringify(run_cmd.pop()?.split(" "));
  const build_cmds_mapped = run_cmd.map((elem) => {
    return "RUN " + elem;
  }).join("\n");
  if (stack == "Python") {
    dockerfile =
      "FROM python:3.11 \nWORKDIR /app \nCOPY requirements.txt . \nRUN pip install --no-cache-dir -r requirements.txt \nCOPY . ." +
      build_cmds_mapped + `\nEXPOSE ${port}\n` + execute_cmd;
  } else if (stack == "NodeJS") {
    dockerfile =
      "FROM node:latest \n WORKDIR /app \n COPY ./package*.json . \n RUN npm install \n COPY . ." +
      build_cmds_mapped + `\n EXPOSE ${port} \n` + execute_cmd;
    console.log(port);
  }
  return dockerfile.toString();
}
