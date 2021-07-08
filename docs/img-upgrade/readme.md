# WebP 升级

加载图片资源时（URL 扩展名为 `jpg`, `jpeg`, `png`,`apng`, `gif`, `ico`），如果 `Accept` 请求头包含 `image/webp`，且清单中存在 `${原文件名}.webp` 文件，那么最终将会使用 WebP 版本。

例如，你可以在清单中定义一个无备用 URL 和参数的文件，仅用于标记该文件存在：

```conf
/img.png.webp
```

当页面访问 `/img.png` 时，如果浏览器支持 WebP，最终将会访问 `/img.png.webp`。如果不支持，仍访问原始文件 `/img.png`。

当然，你也可以给 WebP 文件配置备用 URL 及参数。

```conf
/img.png.webp
	https://foo/img.webp
	https://bar/img.webp
	https://img-host/xxx.gif#pos=50
	hash=xxxx
```

# AVIF 升级

除了 WebP，目前还支持 AVIF 格式。（如果 `Accept` 包含 `image/avif` 且清单存在 `${原文件名}.avif`）

因为 AVIF 更先进，所以 WebP 和 AVIF 同时存在的情况下，程序优先使用 AVIF。


# 忽略场合

如果请求存在以下一种特征，则不会尝试图片升级：

* request.mode === 'cors'

* request.integrity !== ''

业务使用 CORS 模式请求，通常是为了读取资源内容。不同格式的图片，即使像素数据相同，但文件数据显然是不同的，因此可能会出现不符合预期的情况。

`integrity` 就更不用说了。虽然 `<img>` 不支持该属性，但 `fetch()` 允许设置该选项。如果用 WebP 文件替换了 PNG 文件，那么显然通不过校验，导致业务报错。


# 工具生成

freecdn 工具在搜索文件时，如果发现图片文件存在相应的 .webp/.avif 文件，并且图片无备用 URL，则会将相应的 .webp/.avif 文件加入清单。
