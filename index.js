const Koa = require('koa');
const path = require('path');
const serve = require('koa-static');
const route = require('koa-route');
const axios = require('axios');
const qs = require('qs');

const oAuthConfig = {
  clientID: 'node-client-example',
  clientSecret: '37KXvZxQcws~DLgrV51kNHHcbi',
  authorizeURI: 'http://127.0.0.1:4444/oauth2/auth',
  tokenURI: 'http://127.0.0.1:4444/oauth2/token',
  callbackURI: 'http://127.0.0.1:8080/oauth/callback',
  introspectURI: 'http://127.0.0.1:4445/oauth2/introspect',
  scopes: ['openid', 'offline', 'offline_access'],
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
  let tokenResponse = {};
  try {
    const data = qs.stringify({
      grant_type: 'authorization_code',
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: callbackURI,
      code,
      state,
    });

    tokenResponse = await axios.post(oAuthConfig.tokenURI, data, {
      headers: {
        accept: 'application/json',
      },
    });
  } catch (e) {
    console.log(e);
  }

  const accessToken = tokenResponse.data.access_token;
  console.log(`access token: ${accessToken}`);

  const { sub: userName } = await introspect(accessToken);
  ctx.response.redirect(`/welcome.html?name=${userName}`);
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

app.use(main);
app.use(route.get('/oauth/callback', callback));
app.use(route.get('/oauth/forward', forward));

app.listen(8080);
