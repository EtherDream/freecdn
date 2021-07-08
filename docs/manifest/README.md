# 清单

清单（manifest）用于定义 URL 的映射关系，以及相应的配置参数。

清单存放在当前站点根目录，文件名为 `freecdn-manifest.txt`。


# 案例

```bash
# example
/assets/jquery.js
	https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js
	https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
	https://unpkg.com/jquery@3.2.1/dist/jquery.min.js
	hash=hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=
```


# 格式

```bash
# comment
file1
	backup_url_1
	backup_url_2
	...
	param1=value1
	param2=value2
	...

file2
	# comment
	...

@config
	param1=value1
	...
	# comment
```

## 原文件

`https://`、`http://`、`/` 开头，用于定义原文件。`/` 开头表示当前站点的文件。

URL 禁止包含参数部分。实际应用时，访问 `/foo?v=1` 和 `/foo?v=2` 都对应 `/foo` 文件。

如果出现同样的文件名，后出现的将会覆盖已存在的。

## 备用 URL

缩进开头（一个或多个空白符）。

备用 URL 以 `https://`、`http://`、`/` 开头，数量不限。目前不支持递归到清单中其他文件。

如果备用 URL 和当前站点不同源，则必须支持 CORS，否则该 URL 无法使用。

实际运行时，程序未必按清单中的顺序尝试备用 URL。顺序会受站点权重等动态因素影响。

## 参数

缩进开头。使用 key=value 的格式，对当前文件所有备用 URL 生效。

如果只想对某个 URL 生效，可将参数定义在该 URL 的片段部分，例如：

```text
file1
	https://site1/
	https://site2/#k2=v2
	https://site3/#k2=v2&k1=v3
	...
	k1=v1
```

第一个 URL 只有 k1=v1 参数，第二个 URL 有 k1=v1、k2=v2 参数，第三个 URL 有 k1=v3、k2=v2 参数。

URL 片段中的参数具有最高优先级，可覆盖外部定义的参数。

完整的参数可参考 [params.md](params.md)。

URL 行和参数行可以都为空，这种情况仅用于标记文件存在，例如 [图片渐进](../img-upgrade) 的场合。

## config

`@` 开头，用于定义配置。

如果出现同样的配置名，后出现的将会覆盖已存在的。

## ignore

空行，或 `#` 注释行。


# 站点参数

使用 `@host` 可配置备用站点的公共参数。例如：

```bash
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

这里每个 `foo.com` 的 URL 都有 `k1=v1` 配置，显然很累赘。这时可用 `@host` 进行简化：

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

这样任何文件使用 `foo.com` 站点时，默认带有 `k1=v1` 配置。

## 常用案例

```bash
# 访问自己 CDN 时携带完整 referrer，便于分析
@host cdn.mysite.com
	referrer_policy=unsafe-url
```


# 全局参数

使用 `@global` 可定义全局参数。例如：

```
@global
	open_timeout=2s
```

所有文件都会继承该参数。

## 优先级

各类参数的优先级（从低到高）：

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

**清单 URL 可以是当前清单中的文件**，因此可实现冗余处理、完整性校验等操作。例如：

```bash
/manifest-full
	https://site-1/manifest-v1
	https://site-2/manifest-v1
	https://img-host/20201210.gif#pos=50
	hash=xxxxx

@include
	/manifest-full
```

程序将从 site-1、site-2、img-host 加载完整清单，如果都失败，最后尝试当前站点 `/manifest-full` 文件，从而提高稳定性。

配合 Hash 参数，还可防止外部清单被篡改，从而提高安全性。

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

对于存在大量文件并且更新频繁的站点，使用该方案可节省不少流量。


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

私钥由开发者保管，可通过 `freecdn key --list` 查看。
