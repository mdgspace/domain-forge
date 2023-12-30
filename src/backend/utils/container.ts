export default function dockerize(stack:string,port:string,build_cmds:string){
    let dockerfile=""
    let run_cmd = build_cmds.split('\n');
        let execute_cmd = "CMDS " + JSON.stringify(run_cmd.pop().split(" "));
        let build_cmds_mapped = run_cmd.map((elem)=>{
        return "RUN " + elem;
        }).join('\n');
    if(stack=="Python"){
    
        dockerfile = "FROM python:3.10 \n WORKDIR /app \n COPY . . \n"+ build_cmds_mapped+"\n "+ execute_cmd


    }else if(stack=="NodeJS"){
        dockerfile = "FROM node:latest \n WORKDIR /app \n COPY . . \n"+ build_cmds_mapped+`\n EXPOSE ${port} \n`+ execute_cmd
    }
    return dockerfile;

}