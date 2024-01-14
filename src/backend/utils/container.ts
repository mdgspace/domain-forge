export default function dockerize(
  stack: string,
  port: string,
  build_cmds: string,
) {
  let dockerfile = "";
  let run_cmd = build_cmds.split("\n");
  let execute_cmd = "CMD " + JSON.stringify(run_cmd.pop().split(" "));
  let build_cmds_mapped = run_cmd.map((elem) => {
    return "RUN " + elem;
  }).join("\n");
  if (stack == "Python") {
    dockerfile =
      "FROM python:3.11 \n WORKDIR /app \n COPY requirements.txt . \n RUN pip install --no-cache-dir -r requirements.txt \n COPY . ." +
      build_cmds_mapped + `\n EXPOSE ${port}\n` + execute_cmd;
  } else if (stack == "NodeJS") {
    dockerfile =
      "FROM node:latest \n WORKDIR /app \n COPY ./package*.json . \n RUN npm install \n" +
      build_cmds_mapped + `\n EXPOSE ${port} \n` + execute_cmd;
  }
  return dockerfile;
}

// bash ./container.sh -g hack "https://github.com/angelmittal03/mdg-text.git" 'FROM node:latest
//   WORKDIR /app
//   COPY ./client/package*.json .
//   RUN npm install
//   COPY . .
//   EXPOSE 3000
//  CMD ["npm","start"]' 3000
