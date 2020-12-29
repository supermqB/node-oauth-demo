const Koa = require('koa');
const path = require('path');
const serve = require('koa-static');
const route = require('koa-route');
const axios = require('axios');
const qs = require('qs');

const OAUTH_GRANT_TYPES = {
  code: 'authorization_code',
  refresh: 'refresh_token',
};

const hydraPublicURL = process.env.HYDRA_PUBLIC_URL || 'http://127.0.0.1:4444';
const hydraAdminURL = process.env.HYDRA_ADMIN_URL || 'http://127.0.0.1:4445';


const oAuthConfig = {
  clientID: 'node-client-example',
  clientSecret: '37KXvZxQcws~DLgrV51kNHHcbi',
  authorizeURI: `${hydraPublicURL}/oauth2/auth`,
  tokenURI: `${hydraPublicURL}/oauth2/token`,
  callbackURI: 'http://127.0.0.1:8080/oauth/callback',
  introspectURI: `${hydraAdminURL}/oauth2/introspect`,
  scopes: [ 'offline_access', 'person_health', 'insurance_service', 'clinical_exp', 'health_check_service', 'patient_360'],
  //scopes: ['openid', 'offline_access']
};

const app = new Koa();
const main = serve(path.join(__dirname + '/public'));

const randomStr = () => Math.random().toString(36).substring(2, 15);

const forward = ctx => {
  const { authorizeURI, callbackURI, clientID, scopes } = oAuthConfig;
  ctx.redirect(
    `${authorizeURI}?client_id=${clientID}&redirect_uri=${callbackURI}&response_type=code&scope=${scopes.join(
      '+',
    )}&state=${randomStr() + randomStr()}`,
  );
};

const callback = async ctx => {
  const { code, state } = ctx.request.query;
  const { callbackURI, clientID, clientSecret } = oAuthConfig;
  console.log('authorization code:', code);
  let tokenInfo = {};
  try {
    tokenInfo = await getToken({ code, state });
  } catch (e) {
    console.log(e);
  }

  console.log(tokenInfo);

  if (tokenInfo.refresh_token) {
    try {
      tokenInfo = await getToken(
        { state, refresh_token: tokenInfo.refresh_token },
        OAUTH_GRANT_TYPES.refresh,
      );
    } catch (e) {
      console.log(e);
    }
  }

  const userInfo = await introspect(tokenInfo.access_token);
  ctx.body = `<ul>
    <li>tokenInfo: <pre>${JSON.stringify(tokenInfo, null, 4)}</pre></li>
    <li>userinfo: <pre>${JSON.stringify(userInfo, null, 4)}</pre></li>
  </ul>`;
};

const introspect = async accessToken => {
  let result = {};
  try {
    result = await axios({
      method: 'post',
      url: oAuthConfig.introspectURI,
      headers: {
        accept: 'application/json',
      },
      data: qs.stringify({ token: accessToken }),
    });
  } catch (e) {
    console.log(e);
  }
  return result.data;
};

/* retrieve token by code or refresh_token. */
const getToken = async (params, grantType = OAUTH_GRANT_TYPES.code) => {
  const { callbackURI, clientID, clientSecret, tokenURI } = oAuthConfig;
  const authHeader = `Basic ${Buffer.from(`${clientID}:${clientSecret}`, 'binary').toString(
    'base64',
  )}`;
  const data = qs.stringify({
    grant_type: grantType,
    redirect_uri: callbackURI,
    ...params,
  });
  let tokenResponse = {};
  try {
    tokenResponse = await axios.post(tokenURI, data, {
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
      },
    });
  } catch (e) {
    console.log(e);
    debugger;
  }
  return tokenResponse.data;
};

app.use(main);
app.use(route.get('/oauth/callback', callback));
app.use(route.get('/oauth/forward', forward));

app.listen(8080);
