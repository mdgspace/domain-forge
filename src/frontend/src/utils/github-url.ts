export function githubUrl(from:'typeof from'){
    const rootUrl = 'https://github.com/login/oauth/authorize';
    const options = {
        client_id: process.env.VUE_APP_GITHUB_OAUTH_CLIENT_ID,
        redirect_uri: process.env.VUE_APP_GITHUB_OAUTH_REDIRECT_URL,
        scope: 'user:email',
        state: from,
    }
    const qs : URLSearchParams = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
}
