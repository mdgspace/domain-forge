import router from "../router/index.ts";
export async function authorize(code: string) {
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
    const user = resp.text();
    router.push("/");
  } else {
    console.log("no token");
  }
}
