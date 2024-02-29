import router from "../router/index.ts";

const backend = import.meta.env.VITE_APP_BACKEND;

async function authorize(code: string, provider: string) {
  let backendUrl: string;
  if (provider === "github") {
    backendUrl = `${backend}/auth/github`;
  } else if (provider === "gitlab") {
    backendUrl = `${backend}/auth/gitlab`;
  } else {
    console.error("Unsupported authentication provider");
    return;
  }

  const rootUrl = new URL(backendUrl);
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
    if (status === "not authorized") {
      alert("Invalid Credentials");
      router.push("/login");
    } else {
      localStorage.setItem("JWTUser", status);
      console.log(localStorage.getItem("JWTUser"));
      router.push("/");
    }
  } else {
    console.log("no token");
  }
}

async function check_jwt(token: string, provider: string) {
  const rootUrl = new URL(`${backend}/auth/jwt`);
  if (token) {
    const resp = await fetch(rootUrl.toString(), {
      method: "POST",
      headers: {
        "Accept": "application/json",
      },
      body: JSON.stringify({
        "jwt_token": token,
        "provider": provider,
      }),
    });
    const userId = await resp.text();
    if (userId !== "not verified") {
      return userId;
    } else return "";
  } else return "";
}

export { authorize, check_jwt };
