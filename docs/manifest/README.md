# 清单格式

清单用于定义 `原文件` 与 `备用 URL` 的映射，以及相应的配置参数。例如：

```bash
# example
/assets/jquery.js
	https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js
	https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
	https://unpkg.com/jquery@3.2.1/dist/jquery.min.js
	hash=hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=
```

空行会被忽略。缩进使用一个或多个空白符。

绝对路径的 URL 以 `https://` 开头，本地测试时可使用 `http://`。请勿使用 `//` 前缀。

相对路径的 URL 以 `/` 开头，总是从当前站点根目录计算，避免混乱。

URL 必须规范化，例如空格使用 %20 表示，目录分隔符使用一个 `/`，无 `../` 上级目录等。

## 原文件

用于定义需代理的文件，例如上述清单中 `/assets/jquery.js`。

原文件可以是绝对路径 URL，用于覆盖业务中的第三方资源。

## 备用 URL

用于定义代理的目标。缩进开头。

备用 URL 可以是相对路径，但目前不支持递归到清单中其他原文件。

原文件的 URL 会自动添加到备用 URL 中，作为后备资源。

实际运行时，程序未必按清单中的顺序尝试备用 URL，顺序会受站点权重等因素影响。

注意备用 URL 是否支持 CORS，并非所有免费 CDN 都可使用。


## 参数

用于定义资源解码时的操作。缩进开头。使用 key=value 格式。例如：

```text
/foo.js
	https://img.foo.com/xx.png
	https://img.bar.com/yy.png
	pos=1000
	xor=123
```

对于这两个备用 URL，程序都会跳过前 1000 字节数据，并对内容进行 xor 计算。

完整参数可参考 [params.md](params.md)。

如果只想对某个 URL 设置参数，可将参数定义在 URL 的片段部分。例如：

```text
/foo.js
	https://img.foo.com/xx.png#pos=1000&xor=123
	https://mycdn.com/foo.js
```

URL 片段中的参数具有最高优先级，可覆盖外部定义的参数。

## 文件标记

原文件可以没有备用 URL 和参数，例如：

```text
/assets/img.jpg

/assets/img.jpg.webp

/assets/img.jpg.avif
```

这种情况仅用于标记文件存在，例如 [图片渐进](../img-upgrade) 的场合会用到。

## 原文件的 URL Query

原文件的 URL 无需携带 Query。程序查询清单时，会忽略 URL 请求中的 Query。例如：

```text
/foo.js
	...
```

无论请求 `/foo.js?v=1` 还是 `/foo.js?v=2`，都会命中 `/foo.js` 文件。

如果原文件 URL 存在 Query，那么 URL 必须完全相等才会命中。例如：

```text
/getfile.php?name=bar.js
	...
```

只有请求 `/getfile.php?name=bar.js` 才会命中。


## 目录匹配

原文件以 `/` 结尾可匹配目录。备用 URL 也必须以 `/` 结尾，代理时会加上原文件的后缀部分。例如：

```
/api/
	https://api.mysite.com/
```

访问 `/api/path/to?a=1` 代理到 `https://api.mysite.com/path/to?a=1`。

目录匹配可实现批量代理，而不必预先配置每个文件的备用 URL，更简单更灵活。但不可设置 hash 参数，安全性略低。

代理时会保留 method、body 数据，但请求头需通过 [req_headers](params.md#req_headers) 参数保留，响应头需通过 [headers](params.md#headers) 保留，状态码需通过 [valid_status](params.md#valid_status) 保留。备用 URL 推荐使用子域名，从而能通过根域 cookie 携带登录态。

注意，一次请求可能会访问多个备用 URL。因此对于动态接口，后端必须有防重放机制。同时设置 [stream=off](params.md#stream) 禁用流模式，防止每个 URL 内容不一致，导致内容错乱。


## 配置

配置以 `@` 开头，用于定义一些参数。参考下文。

## 覆盖

如果出现同样的文件名、配置名，后出现的将会覆盖已存在的。这个机制在清单外链时会用到。

# 权重配置

使用 `@weight` 可配置站点的初始权重值，数字越大优先级最高。例如：

```text
@weight
	cdnjs.cloudflare.com=100
	cdn.jsdelivr.net=60
```

程序会优先使用 cdnjs 站点的备用 URL。

在 `@weight ` 后面添加地区信息，可为不同地区的用户使用不同的权重：

```text
@weight zh-cn
	lib.baomitu.com=100
	cdn.jsdelivr.net=50
	ajax.googleapis.com=0
```

这样可根据实际情况，为不同地区的用户分配更合理的站点。

地区信息目前使用 `navigator.language` 属性，小写值。

地区中有 `-` 的时候，例如 `en-us`，程序会优先使用 `@weight en-us`；没有则尝试 `@weight en`，最后尝试 `@weight`。如果都没有，则使用程序内置的 [默认权重](https://github.com/EtherDream/freecdn-js/blob/master/core-lib/src/zone-host.ts)。

# 站点参数

使用 `@host` 可配置备用站点的公共参数。例如：

```text
/file1
	https://foo.com/file1#k1=v1
	https://bar.com/file1

/file2
	https://foo.com/file2#k1=v1
	https://bar.com/file2

/file3
	https://foo.com/file3#k1=v1
	https://bar.com/file3
```

这里每个 `foo.com` 的 URL 都有 `k1=v1` 配置，显然很累赘。这时可用 `@host` 统一配置：

```bash
@host foo.com
	k1=v1

/file1
	https://foo.com/file1
	https://bar.com/file1

/file2
	https://foo.com/file2
	https://bar.com/file2

/file3
	https://foo.com/file3
	https://bar.com/file3
```

这样 `foo.com` 站点的备用 URL 默认带有 `k1=v1` 配置。

## 常用案例

```bash
# 访问自己 CDN 时携带完整 referrer，便于分析
@host cdn.mysite.com
	referrer_policy=unsafe-url

# 访问图床站点时，自动跳过前 1000 字节的图片外壳
@host i.imgur.com
	pos=1000
```


# 全局参数

使用 `@global` 可定义全局参数。例如：

```
@global
	open_timeout=2s
```

所有备用 URL 都会继承该参数。

# 参数优先级

总结下各类参数的优先级（从低到高）：

[系统预设参数](params.md#系统预设参数) < 全局参数 < 站点参数 < 文件参数 < URL 片段参数


# 外部清单

使用 `@include` 可配置外部清单 URL 列表。例如：

```bash
@include
	https://foo/manifest-1.conf
	https://bar/manifest-2.conf
```

freecdn 会依次加载它们，扩充到当前清单结尾。

将完整的清单存储在免费 CDN 上，可减少入口清单的体积，从而节省你的站点流量。

> 目前不支持多层嵌套，即外部清单不支持 `@include`。

**清单 URL 可以是当前清单中的原文件**，例如：

```text
/manifest-full
	https://site-1/manifest-v1
	https://site-2/manifest-v1
	https://img-host/20201210.gif#pos=50
	hash=xxxxx

@include
	/manifest-full
```

程序将从 site-1、site-2、img-host 加载完整清单，如果都失败，最后尝试当前站点 `/manifest-full` 文件，从而提高稳定性。配合 Hash 参数，还可防止外部清单被篡改，从而提高安全性。

有了这个机制，无论资源数量有多少，你站点下的清单只需存储几个 URL 和 Hash，通常只有几百字节，进一步降低流量开销。

## 优化建议

为了避免很小的改动导致用户重新下载完整清单，你可以将小改动放在一个补丁清单里。因为同名的文件配置，后出现的会覆盖已存在的，所以完整清单里的旧配置会被后面的补丁清单覆盖：

```bash
/manifest-full
	https://site-1/2020-10
	https://site-2/2020-10
	hash=xxxxx

/manifest-patch
	https://site-1/2020-10-15_18-05-01
	https://site-2/2020-10-15_18-05-01
	hash=xxxxx

@include
	/manifest-full
	/manifest-patch
```

小变更累积在 `/manifest-patch` 对应的 URL 里，这样用户只需下载较小的文件；完整清单的 URL 保持不变，用户仍从缓存中获取。这样即使频繁更新，用户也不会消耗很多流量。

当补丁文件变得较大时，再重新生成完整清单，清空补丁文件。

对于存在大量文件并且更新频繁的站点，使用该方案可节省不少流量。当然，如果 CDN 流量是免费的话，就没必要这么麻烦了。


# 更新参数

使用 `@update` 配置更新参数。清单有两种更新方式：定期轮询 和 消息推送。

## 定期轮询

freecdn 每隔一段时间访问 `/freecdn-manifest.txt`，检查清单是否有变化。时间间隔通过 `interval` 参数设置，格式为 [时间单位](unit.md#时间单位)，例如：

```bash
@update
	interval=100s
```

如果参数未指定，默认为 300s。

## 消息推送

相比轮询，消息推送实时性更高。

freecdn 使用 WebSocket 和更新服务器保持长连接，当服务器检测到站点清单有变化时，会通知所有在线用户；用户收到通知后，重新加载清单文件，从而快速生效。

更新服务器的 URL 通过 `services` 参数设置。可设置多个，使用空格间隔，例如：

```bash
@update
	services=wss://foo.com wss://bar.com
```

你可以使用公共服务，或者 [搭建自己的服务](https://github.com/EtherDream/freecdn-update-svc)。

> 即使开启消息推送，清单仍会定期轮询，确保推送服务不稳定的情况下仍能更新，提升稳定性。

## 备用地址

通过 `backup` 参数可指定清单的备用地址，多个使用空白符分隔：

```bash
@update
	backup=url1 url2 ...
```

如果程序从当前站点获取清单失败，则依次从备用地址获取，使网站具备离线更新的能力。

## 清单签名

清单必须存在签名才能在离线模式下使用。

签名位于清单最后行，以 `# SIGN: ` 开头：

```bash
...
# SIGN: $sign-base64
```

签名算法为 `ECDSA SHA-256`，使用 Base64 编码，共 88 字符（二进制 64 字节）。实际使用时可通过 `freecdn manifest --sign` 对清单进行签名。

公钥硬编码在 loader-js 中，防止被恶意脚本篡改。通过 `freecdn js --make` 创建的脚本已自动填入公钥。

私钥由开发者保管，可通过 `freecdn key` 查看。
