这是一个基于node + express的 hydra oAuth 2.0 测试应用
## 注册应用
 ```
 hydra clients create \
    --endpoint http://localhost:4445 \
    --id node-client-example \
    --secret 37KXvZxQcws~DLgrV51kNHHcbi \
    --grant-types authorization_code,refresh_token \
    --response-types code,id_token \
    --scope openid,offline_access \
    --callbacks http://127.0.0.1:8080/oauth/callback

 ```
> *注意： endpoint 是你hydra实例的地址*
- docker compose 版本：http://localhost:4445
- k8s helm 版本： http://admin.hydra.localhost

## 运行此应用

```bash
$ npm install
$ node index.js
```

## 访问测试应用
```
http://localhost:8080
```

