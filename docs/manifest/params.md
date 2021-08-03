# 简介

该文档包含了所有解码参数，以及相应的演示和应用场景。

演示使用最新版 Chrome 浏览器。建议使用隐身模式访问，不要勾选禁用缓存。

演示清单地址：https://freecdn.etherdream.com/freecdn-manifest.txt


# hash

校验资源完整性。使用 `SHA-256` 算法，Base64 编码。

## 格式

```
hash=[BLK_LEN;]B1_HASH[,B2_HASH,...,Bn_HASH]
```

* BLK_LEN: 每个块的长度，[字节单位](unit.md#字节单位)。（可选。默认为整个文件的长度）

* B1_HASH: 第 1 个块的 Hash 值。

* Bn_HASH: 第 N 个块的 Hash 值。（可选）

## 演示 1

```bash
/jquery.js
	https://ajax.cdnjs.com/ajax/libs/jquery/3.2.1/jquery.min.js
	https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.js
	https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
	https://unpkg.com/jquery@3.2.1/dist/jquery.min.js
	hash=hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=
```

访问 https://freecdn.etherdream.com/jquery.js 可显示 jQuery v3.2.1 脚本。

使用 charles、fiddler 等工具，劫持上述 4 个 URL 中任意 3 个并修改内容，程序最终仍能获得预期结果。

## 演示 2

```
/bigpic.jpg
	https://cdn.jsdelivr.net/gh/zjcqoo/test@0.0.1/assets/img/pic.jpg
	https://raw.githubusercontent.com/zjcqoo/test/0.0.1/assets/img/pic.jpg
	hash=cdVzXONwA1MiVj/5ywlEXtcAmGRaXkI5NQI8h26VvuI=
```

访问 https://freecdn.etherdream.com/bigpic.jpg 可显示一个大图片。

由于此处只有 1 个 Hash，因此程序必须等整个文件下载完才能校验，然后一次性输出内容。这导致图片长时间空白最后瞬间出现，而不是原本边下载边显示的效果。

如果我们配置 7 个 Hash（每 1MiB 内容配置一个）：

```
/bigpic-progress.jpg
	https://cdn.jsdelivr.net/gh/zjcqoo/test@0.0.1/assets/img/pic.jpg?v=2
	https://raw.githubusercontent.com/zjcqoo/test/0.0.1/assets/img/pic.jpg?v=2
	hash=1MiB;RP5gY0Fw9m3POnCKDmsYYzlRXaNOXSMm4mPUCKAdSn0=,2nLH6dXHsH5+qFTErCPMcdv5sSFCACnWhOSAwlMJ+6U=,/B5dU0xDWIO9YiuPP7rIAKtKqjRm9/7G4SDhk64tOSQ=,qHLstw2Bwx132q2WlRaK1YjoL7BgZwmdIBdcI78J5Qw=,uwL75DomXrwaaneQ0UkkXZ0VxkbsU9OGfqZmvwF/0iM=,vxBoPcxURH1fztvaRGAsv2I0s6UmcE2Ohm5I/F8r+eA=,MsVDWS1t8AFRISOV4G2GX0589oHfnpegBUvwj2uNUU0=
```

访问 https://freecdn.etherdream.com/bigpic-progress.jpg 可见图片会逐渐展示，用户体验更好。

因此合理配置 hash 数，有助于提高媒体资源的加载体验。通过工具生成的清单，默认会为媒体文件设置多个 Hash。


# pos

指定文件读取位置，跳过开头数据。

## 格式

```
pos=N
```

* N: 需跳过的长度，[字节单位](unit.md#字节单位)。

## 演示

```bash
/world.txt
	https://cdn.jsdelivr.net/gh/zjcqoo/files/helloworld.txt
	https://raw.githubusercontent.com/zjcqoo/files/master/helloworld.txt
	pos=5
```

访问 https://freecdn.etherdream.com/world.txt 显示 `World`，丢弃了前面 5 字节数据（`Hello`）。

## 应用场景 1

有些网页使用了修改过的公共库，例如删除了文件开头的注释、换行等字符。虽然这些文件的功能与官方版本没区别，但也不能简单粗暴地替换成官方版本 —— 假如业务依赖文件数据，可能会出现和预期不一致的情况。例如脚本元素设置了 integrity 属性时，就会因为校验不通过导致加载失败。

为此，你可以通过 `pos` 参数跳过官方版本前 N 字节，使剩余部分和自己的文件保持一致，从而充分利用公共资源。

例如删除 angular 脚本开头的注释：

```bash
/angular-trim-left-comment.js
	https://ajax.cdnjs.com/ajax/libs/angular/11.2.11/core.umd.js
	https://cdnjs.cloudflare.com/ajax/libs/angular/11.2.11/core.umd.js
	pos=103
```

演示：https://freecdn.etherdream.com/angular-trim-left-comment.js

## 应用场景 2

很多网站在处理上传的图片时不会校验文件长度，因此你可以将任意类型的文件附在某个图片末尾，从而当做图片上传。使用时跳过图片长度，即可获得原始文件。例如：

```bash
cat foo.gif bootstrap.css > upload.gif
```

上传 upload.gif 到相册，使用时跳过 foo.gif 的长度，即可获得 bootstrap.css 的内容。

```bash
/bootstrap.css
	https://upload-images.jianshu.io/upload_images/6294093-024c01585150945f.gif
	https://i0.hdslb.com/bfs/article/a0d6d20bad243e07753aed093da5a3b4cae71356.gif
	https://pic2.zhimg.com/80/v2-c663ccbc3aac0728c54885313c9db85e.gif
	pos=433
	hash=SmSEXNAArTgQ8SR6kKpyP/N+jA8f8q8KpG0qQldSKos=
```

演示：https://freecdn.etherdream.com/bootstrap.css

使用这个方案，你可以将任意类型的文件通过图床、相册进行免费加速。

当然也有些网站会校验图片长度，导致上传失败或附加数据丢失。


# size

限制文件长度，丢弃超出部分。

## 格式

```
size=N
```

* N: 文件长度，[字节单位](unit.md#字节单位)。

## 演示

```bash
/hello.txt
	https://cdn.jsdelivr.net/gh/zjcqoo/files/helloworld.txt
	https://raw.githubusercontent.com/zjcqoo/files/master/helloworld.txt
	size=5
```

访问 https://freecdn.etherdream.com/hello.txt 显示 `Hello`，丢弃了后面的数据（`World`）。

## 应用场景 1

有些网页使用了修改过的公共库，例如删除了文件末尾的注释、换行等字符。此时可通过 `size` 参数截取官方版本的前面部分，从而保持两者内容一致。

例如删除 angular 脚本末尾的注释：

```bash
/angular-trim-right-comment.js
	https://ajax.cdnjs.com/ajax/libs/angular/11.2.11/core.umd.js
	https://cdnjs.cloudflare.com/ajax/libs/angular/11.2.11/core.umd.js
	size=1524395
```

演示：https://freecdn.etherdream.com/angular-trim-right-comment.js

`pos` 和 `size` 参数结合使用，可截取文件中间部分。例如同时删除 angular 脚本开头和末尾的注释：

```bash
/angular-trim-comment.js
	https://ajax.cdnjs.com/ajax/libs/angular/11.2.11/core.umd.js
	https://cdnjs.cloudflare.com/ajax/libs/angular/11.2.11/core.umd.js
	pos=103
	size=1524292
```

演示：https://freecdn.etherdream.com/angular-trim-comment.js

## 应用场景 2

有些网站虽然会校验上传图片的文件长度，但不会修改文件内容。此时你可以将原文件填充在头部信息或其他位置，使用时通过 `pos` 和 `size` 进行提取。


# prefix

往文件开头添加内容。

## 格式

```
prefix="string" | BASE64
```

* 双引号开头和结尾，作为字符串解析。支持 `\t`, `\n` 等转义字符（使用 JSON 字符串格式）

* 否则作为 Base64 解码（内容含有二进制数据时使用）

## 演示

```bash
/abc-helloworld.txt
	https://cdn.jsdelivr.net/gh/zjcqoo/files/helloworld.txt
	https://raw.githubusercontent.com/zjcqoo/files/master/helloworld.txt
	prefix="abc-"
```

访问 https://freecdn.etherdream.com/abc-helloworld.txt 可见 `abc-HelloWorld`。

## 应用场景

有时开发者在公共库开头添加了注释、换行甚至其他代码，导致无法使用公共资源加速。此时可通过 `prefix` 参数补上这些内容，从而能复用公共资源。

例如在脚本开头添加一些字符：

```bash
/angular-insert-comment.js
	https://ajax.cdnjs.com/ajax/libs/angular/11.2.11/core.umd.js
	https://cdnjs.cloudflare.com/ajax/libs/angular/11.2.11/core.umd.js
	prefix="/* created by etherdream */\n\n"
```

演示：https://freecdn.etherdream.com/angular-insert-comment.js


# suffix

往文件结尾添加内容。

## 格式

```
suffix="string" | BASE64
```

格式和 `prefix` 一样。

## 演示

```bash
/helloworld-xyz.txt
	https://cdn.jsdelivr.net/gh/zjcqoo/files/helloworld.txt
	https://raw.githubusercontent.com/zjcqoo/files/master/helloworld.txt
	suffix="-xyz"
```

访问 https://freecdn.etherdream.com/helloworld-xyz.txt 可见 `HelloWorld-xyz`。

## 应用场景

有时开发者在公共库结尾添加了注释、换行甚至其他代码，导致无法使用公共资源加速。此时可通过 `suffix` 参数补上这些内容，从而能复用公共资源。

例如在脚本末尾添加一些字符：

```bash
/angular-append-comment.js
	https://ajax.cdnjs.com/ajax/libs/angular/11.2.11/core.umd.js
	https://cdnjs.cloudflare.com/ajax/libs/angular/11.2.11/core.umd.js
	suffix="\n\n//-------"
```

演示：https://freecdn.etherdream.com/angular-append-comment.js


# br

解压缩 brotil 文件。

## 格式

```
br=on | off
```

如果为 `off` 则不开启该功能。

## 演示

```
/helloworld-br.txt
	https://cdn.jsdelivr.net/gh/zjcqoo/files/helloworld.txt.br
	https://raw.githubusercontent.com/zjcqoo/files/master/helloworld.txt.br
	br=on
```

访问 https://freecdn.etherdream.com/helloworld-br.txt 显示 `HelloWorld`，该内容从 helloworld.txt.br 解压得到。

## 应用场景

Web 服务器通常只对文本类型的资源开启 gzip、br 压缩，而不会对图片资源开启，因为正常情况下图片本身就是压缩过的数据，二次压缩意义不大。但是，如果我们把文本数据附在图片末尾上传，这时的「图片」文件冗余很大，而服务器却不会对其压缩。

为此我们可对原文件进行 br 压缩，然后附在图片末尾：

```bash
brotil bootstrap.css
cat foo.gif bootstrap.css.br > upload.gif
```

使用时先截取再解压：

```bash
/bootstrap-compressed.css
	https://upload-images.jianshu.io/upload_images/6294093-0bd2662b74260300.gif
	https://i0.hdslb.com/bfs/article/a5eeef15f6f9d8de837061ed46efd9ad83b3cdcd.gif
	https://pic2.zhimg.com/80/v2-316ffeded9efe3748a87317e0747d124.gif
	pos=433
	br=on
	hash=SmSEXNAArTgQ8SR6kKpyP/N+jA8f8q8KpG0qQldSKos=
```

演示：https://freecdn.etherdream.com/bootstrap-compressed.css

对比之前 https://freecdn.etherdream.com/bootstrap.css 版本，虽然最终内容一样，但它对应的图片有 174kB。而当前版本对应的图片只有 17kB，减少 90% 的体积。

## 备注

目前解压逻辑通过 WebAssembly 实现。首次访问 br 资源时会加载 wasm 文件（~80kB）和 JS 文件（~2kB），这两个文件默认也从公共 CDN 下载。如果公共 CDN 不可用，则从当前站点 `/freecdn-internal/$VER/br` 加载。

如果 WebAssembly 无法创建，程序直接访问原始 URL，不再使用备用 URL。


# xor

混淆文件内容。

## 格式

```
xor=U8
```

* U8: 一个 [0, 255] 的整数

## 演示

```bash
/helloworld-xor.txt
	https://cdn.jsdelivr.net/gh/zjcqoo/files/helloworld.txt.xor
	https://raw.githubusercontent.com/zjcqoo/files/master/helloworld.txt.xor
	xor=123
```

访问 https://freecdn.etherdream.com/helloworld-xor.txt 显示 `HelloWorld`，该内容从 helloworld.txt.xor 解码得到。

## 应用场景

如果你的文件包含某些特殊内容导致无法上传，可尝试对原文件进行 xor 混淆，从而避开明文数据。

```js
// xor.js
// node xor key < infile > outfile
const key = +process.argv[2]
process.stdin.on('data', chunk => {
  process.stdout.write(chunk.map(v => v ^ key))
})
```

注意，该功能仅用于轻度混淆，不可作为加密使用。


# mime

指定资源 MIME 类型，设置 `content-type` 响应头。

## 格式

```
mime=MIME | auto
```

如果为 `auto`，程序将根据原文件的扩展名，从内置列表中查找。如果找不到，则使用原始响应头的 MIME。

> 为什么不直接使用原始响应头的 MIME？因为它可能是错的。例如 jsdelivr、unpkg 站点会将网页文件的 MIME 设置成 text/plain。因此原始响应头的 MIME 并不可信。

## 演示

```bash
/alert.jpg
	https://cdn.jsdelivr.net/gh/zjcqoo/files/hello-script.txt
	https://raw.githubusercontent.com/zjcqoo/files/master/hello-script.txt
	mime=text/html
```

访问 https://freecdn.etherdream.com/alert.jpg 弹出 alert 对话框，可见浏览器使用 HTML 类型解析该文件。

## 应用场景

考虑到该参数极其常用，我们为清单中所有文件都预设了 `mime=auto`，因此通常你无需设置该参数。除非你想修改默认类型（例如上述演示），此时需设置 MIME 参数。


# charset

指定资源字集，追加在 `content-type` 响应头。

## 格式

```
charset=CHARSET | off
```

如果为 `off` 则不开启该功能。

## 演示

```bash
/hello-gb2312.txt
	https://cdn.jsdelivr.net/gh/zjcqoo/files/gb2312.txt
	https://raw.githubusercontent.com/zjcqoo/files/master/gb2312.txt
	charset=gb2312
```

访问 https://freecdn.etherdream.com/hello-gb2312.txt 显示 `你好`，可见 `content-type` 响应头为 `text/plain; charset=gb2312`。

访问备用 URL 则显示乱码，因为 `content-type` 响应头为 `text/plain; charset=utf-8`，显然无法还原内容。

## 应用场景

假如网站所有文本文件都是 GBK 字集，那么可在全局参数中定义：

```bash
@global
	charset=GBK
```

这样就无需为每个文件重复定义了。

## 备注

不推荐使用 HTTP 响应头定义字集。即使网站存在非 UTF-8 字集的文件，最好是在前端定义，例如 `<script charset="gbk" src="...">`，这样有很好的扩展性，以防更换后端服务时因漏配参数而出现问题。


# headers

设置响应头。程序默认会丢弃服务端返回的响应头。如需保留或添加，可通过该参数设置。

## 格式

```
headers={"key1": "val1", "key2": "val2", ...}
```

如果 value 为空，则使用服务端返回的值。如果 value 为空且 key 为 `*`，则保留所有服务端的头。

如果加载过程使用了多个备用 URL，选择最先返回的响应头。

无法设置系统相关的头，例如 `Set-Cookie`、`Content-Encoding` 等。

## 演示

```bash
/set-res-headers.txt
	https://cdn.jsdelivr.net/gh/zjcqoo/files/helloworld.txt
	https://raw.githubusercontent.com/zjcqoo/files/master/helloworld.txt
	headers={"x-via": "freecdn", "cache-control": ""}
```

打开控制台网络栏，访问 https://freecdn.etherdream.com/set-res-headers.txt 可见 `x-via` 响应头变成了 `freecdn`，以及保留了服务器返回的 `cache-control` 响应头。服务器返回的其他响应头都被丢弃。

## 备注

注意 [CORS-safelisted response header](https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_response_header) 规则。

例如 cdn.jsdelivr.net 支持 `access-control-expose-headers: *`，因此可保留 `x-served-by` 等自定义头；而 raw.githubusercontent.com 不支持，因此无法保留自定义头，只能保留几个基本头。


# req_headers

设置请求头。程序默认会丢弃上层业务设置的请求头。如需保留或添加，可通过该参数设置。

## 格式

```
req_headers={"key1": "val1", "key2": "val2", ...}
```

如果 value 为空，则使用上层业务设置的值。如果 value 为空且 key 为 `*`，则保留所有上层业务的头。

无法设置系统相关的头，例如 `Cookie`、`Accept-Encoding` 等。

## 演示

```bash
/echo-req-headers.txt
	https://www.etherdream.com/echo_headers
	req_headers={"x-requested-with": "freecdn", "x-client-id": ""}
```

访问 https://freecdn.etherdream.com/echo-req-headers.txt 可回显所有请求头，其中存在 `x-requested-with: freecdn`。打开控制台网络栏，可见访问备用 URL 时附加了该请求头。

在控制台中通过脚本发起请求，添加自定义头：

```js
const res = await fetch('/echo-req-headers.txt', {
  headers: {
    'x-user-id': '123',
    'x-client-id': '456',
  }
})
console.log(await res.text())
```

回显结果存在 `x-client-id: 456`（被保留），不存在 `x-user-id: 123`（被丢弃）。

## 应用场景

如果目标站点只允许特定的 referrer，可使用该参数进行伪造。

```bash
/custom-referrer.txt
	https://www.etherdream.com/echo_headers
	referrer_policy=unsafe-url
	req_headers={"referer": "/path/to?k1=v1&k2=v2"}
```

访问 https://freecdn.etherdream.com/custom-referrer.txt 可见 `referer` 请求头被设置成了 `https://freecdn.etherdream.com/path/to?k1=v1&k2=v2`。当然只能伪造 referrer 的路径部分，协议、主机名、端口是无法伪造的。


## 备注

设置自定义的请求头会触发 [CORS Preflight](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)，确保所有备用 URL 的站点都支持。

----

# referrer_policy

设置请求 referrer 策略。

## 格式

```
referrer_policy=REFERRER-POLICY | raw
```

REFERRER-POLICY 的值可 [参考文档](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)。

如果为 `raw` 则使用上层业务的 referrer 策略（例如 fetch 函数可指定 `referrerPolicy` 选项，页面也可通过 `<meta>` 定义 referrer 策略）

如果未设置该参数，默认使用 `same-origin`，即请求同源 URL 携带完整 referrer，请求跨源 URL 不携带 referrer，最大程度防止外链限制。

## 演示

```bash
/referrer-full.txt
	https://www.etherdream.com/echo_headers
	referrer_policy=unsafe-url

/referrer-origin.txt
	https://www.etherdream.com/echo_headers
	referrer_policy=origin

/referrer-no.txt
	https://www.etherdream.com/echo_headers
	referrer_policy=no-referrer

/referrer.txt
	https://www.etherdream.com/echo_headers
```

访问 https://freecdn.etherdream.com/index.html?a=1&b=2 ，打开控制台。

执行 `fetch('/referrer-full.txt')`，可见访问 `https://www.etherdream.com/echo_headers` 的请求头 referrer 为当前页面 URL。

执行 `fetch('/referrer-origin.txt')`，可见访问 `https://www.etherdream.com/echo_headers` 的请求头 referrer 路径只有 `/`。

执行 `fetch('/referrer-no.txt')`，可见访问 `https://www.etherdream.com/echo_headers` 的请求头不存在  referrer。

执行 `fetch('/referrer.txt')`，可见访问 `https://www.etherdream.com/echo_headers` 的请求头不存在  referrer。

## 应用场景

假如你的网站是 `www.foo.com`，备用 URL 有用到自己的 CDN（`cdn.foo.com`）。由于默认情况下跨源 URL 不携带 referrer，导致自己的 CDN 无法识别外链。

为此，你可以将自己的 CDN 加入白名单：

```bash
@host cdn.foo.com
	referrer_policy=unsafe-url
```

对于任意文件，只要备用 URL 的站点为 `cdn.foo.com`，程序默认携带完整 referrer。

## 备注

注意，不携带 referrer 并不能完全绕过外链限制，因为 `origin` 请求头也会暴露当前站点的域名，并且该请求头必定存在。


# expires

指定资源缓存时间，设置 `cache-control` 响应头。在过期时间内再次访问该资源，浏览器直接从内存缓存（`memory cache`）加载，而不会请求 Service Worker。

## 格式

```
expires=T
```

* T: 缓存时间，[时间单位](unit.md#时间单位)。

为了提高性能，我们为清单中所有文件预设了 30s 缓存时间，避免频繁请求 Service Worker。

## 演示

```bash
/img-cache-20s.jpg
	https://cdn.jsdelivr.net/gh/zjcqoo/test@0.0.1/assets/img/pic.jpg?v=2
	https://raw.githubusercontent.com/zjcqoo/test/0.0.1/assets/img/pic.jpg?v=2
	expires=20s
	hash=1MiB;RP5gY0Fw9m3POnCKDmsYYzlRXaNOXSMm4mPUCKAdSn0=,2nLH6dXHsH5+qFTErCPMcdv5sSFCACnWhOSAwlMJ+6U=,/B5dU0xDWIO9YiuPP7rIAKtKqjRm9/7G4SDhk64tOSQ=,qHLstw2Bwx132q2WlRaK1YjoL7BgZwmdIBdcI78J5Qw=,uwL75DomXrwaaneQ0UkkXZ0VxkbsU9OGfqZmvwF/0iM=,vxBoPcxURH1fztvaRGAsv2I0s6UmcE2Ohm5I/F8r+eA=,MsVDWS1t8AFRISOV4G2GX0589oHfnpegBUvwj2uNUU0=
```

访问 https://freecdn.etherdream.com/memory-cache.html 可见图片。打开控制台网络栏，不断刷新页面，日志 `/img-cache-20s.jpg` 显示来自 `memory cache`，20s 后才变成来自 `ServiceWorker`。


# open_timeout

设置最大请求时间。请求时间为「发起请求」到「完成响应头接收」的时间，不包括数据下载阶段。

如果超时，程序开启下一个 URL，防止长时间阻塞在不稳定的 CDN 上。**当前 URL 仍保持下载，不会终止**；只有当某个 URL 完成时，其他 URL 才会被终止。（后面 `recv_timeout` 参数也一样）

## 格式

```
open_timeout=T
```

* T: 最大请求时间，[时间单位](unit.md#时间单位)。

为了避免过慢的 CDN，我们为清单中所有文件预设了 `open_timeout=10s`。

## 演示

```bash
/open-timeout.txt
	https://www.etherdream.com/delay?data=a&time=5000
	https://www.etherdream.com/delay?data=b&time=1000
	https://www.etherdream.com/delay?data=c&time=3000
	open_timeout=2s
```

访问 https://freecdn.etherdream.com/open-timeout.txt 等待几秒后，显示 `b`。

## 应用场景

如果你希望公共资源能更快加载，而不在意流量消耗的话，可尝试「流量换速度」的策略 —— 同时从多个备用 URL 加载，哪个先完成就用哪个。

```bash
/bandwidth-time-trade-off.js
	https://ajax.cdnjs.com/ajax/libs/jquery/3.2.1/jquery.min.js
	https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
	https://unpkg.com/jquery@3.2.1/dist/jquery.min.js
	hash=hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=
	open_timeout=0
```

打开控制台网络栏，访问 https://freecdn.etherdream.com/bandwidth-time-trade-off.js 可见同时产生多个请求，当其中一个 URL 下载完成时，其他的 URL 都被终止（日志为红色 canceled 状态）。

该方案在备用 URL 不稳定时很有用，避免串行重试增加时间。

## 备注

如果某个站点长时间未访问，那么请求时间还包括 DNS 查询、TCP 连接、HTTPS 握手等额外时间，因此需考虑这种冷启动的情况，超时不能设置过低。


# recv_timeout

设置单位时间内最少接收量，从收到响应开始统计。

## 格式

```
recv_timeout=N/T
```

* N: 数据长度，[字节单位](unit.md#字节单位)。

* T: 统计时间，[时间单位](unit.md#时间单位)。

相比 kB/s、MB/s 等单位每秒统计一次，这里可使用更长的统计时间，降低网络抖动的影响。


# stream

开启或禁用流模式。程序默认开启流模式，收到数据立即输出。如果禁用流模式，数据先缓存到队列，最后一次性输出。

## 格式

```
stream=on | off
```

如果为 `on` 则保持默认行为，忽略此模块。

## 演示

```bash
/stream-on
	https://freecdn.etherdream.com/stream.html?num=5

/stream-off
	https://freecdn.etherdream.com/stream.html?num=5
	stream=off
```

访问 https://freecdn.etherdream.com/stream-on 可边加载边显示。

访问 https://freecdn.etherdream.com/stream-off 需等待数秒，最后一次性显示所有内容。

## 应用场景

如果文件使用了多个备用 URL 但未设置 Hash 参数，此时需考虑各个 URL 的返回内容是否一致。如果不一致，那么在多个 URL 切换时可能会出现内容错乱的情况。此时需禁用流模式，让每个 URL 各自下载，然后再选择最先完成的 URL。

目录代理、接口代理等返回内容不固定的场合，推荐使用该参数。

```bash
/api/
	https://foo/api/
	https://bar/api/
	...
	stream=off
```

## 备注

Hash 参数也有禁用数据流的效果，因此设置 Hash 后不必再使用该参数。


# 参数顺序

参数应用不使用清单中的定义顺序，而是内置的先后顺序：

```
open_timeout
recv_timeout
referrer_policy
referrer
req_headers
expires
mime
headers
pos
size
xor
br
prefix
suffix
hash
stream
```

例如 hash 校验的是最终呈现的数据，而不是裁剪、拼接、解压前的数据。


# 系统预设参数

```bash
expires=30s
mime=auto
open_timeout=10s
```
