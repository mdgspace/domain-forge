import router from "../router/index.ts";

let isAuthenticated = false;
async function authorize(code: string) {
  const rootUrl = new URL("http://localhost:9999/auth/github");
  if (code !== undefined) {
    const resp = await fetch(rootUrl.toString(), {
      method: "POST",
      headers: {
        "Accept": "application/json",
      },
      body: code,
    });
    console.log(resp);
    const status = await resp.text();
    if (status == "not authorized") {
      alert("Invalid Credentials");
      isAuthorized = true;
      router.push("/login");
    } else {
      console.log(status);
      router.push("/", { user: status });
    }
  } else {
    console.log("no token");
  }
}

export { authorize, isAuthenticated };
