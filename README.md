# freecdn

[![npm version](https://img.shields.io/npm/v/freecdn.svg?style=flat)](https://www.npmjs.com/package/freecdn)

freecdn 是一个纯前端的 CDN 解决方案，用于降低网站流量成本，同时提高网站稳定性、安全性，并且无需修改现有的业务逻辑。

# 最近更新

v0.1.1

* 新增 [站点权重](docs/manifest/README.md#权重配置) 配置。

* 更新清单文档、参数文档。

* 更新公共库，新增字节跳动 CDN。


# 功能亮点

## 自动选择公共库

互联网上有很多免费的公共库 CDN，例如 `cdnjs`、`jsdelivr`、`unpkg`，但哪个最稳定，始终没有明确的答案。

现在你无需纠结这个问题，随意选择即可。freecdn 可根据用户的网络状况，实时切换到合适的 CDN。[查看更多](docs/feature/README.md#自动选择公共库)

## 全站 Hash 校验

现代浏览器可通过 SRI 校验资源完整性，降低第三方站点的风险。但 SRI 也存在一些不足，例如支持的类型太少、需要修改 HTML、缺少备用机制。

freecdn 能校验任意类型的资源，例如图片是否被篡改，从而提升内容安全；无需修改 HTML，并且所有 Hash 统一维护，方便使用和更新；即使校验失败，自动切换到备用资源，避免损坏业务。[查看更多](docs/feature/README.md#全站-Hash-校验)

## 充分利用图床

网站图片很耗流量，不少人将图片上传到图床、相册等第三方站点，充当免费 CDN。但这也存在诸多难以预测的情况，例如图片被删、限制外链、添加水印、有损压缩、限速等等。

现在你无需担心这些问题。你只需将图片备份到多个图床，freecdn 会依次尝试，直到获得预期内容。此外，不仅是图片，任意类型的文件都可通过图床加速！[查看更多](docs/feature/README.md#充分利用图床)

## 网站离线运行

任何网站都无法避免网络故障，例如机房故障、DNS 故障、运营商丢包、DDOS 攻击，导致网站无法稳定访问。

freecdn 支持网站离线运行。用户只有首次访问依赖你的服务器，之后即使服务器关机，前端程序也能从备用站点加载最新的页面和资源，成为一个不依赖中心的网站。[查看更多](docs/feature/README.md#网站离线运行)

## WebP 无缝兼容

相比 JPG/PNG/GIF 等格式，WebP 有着更高的压缩率，但并非所有浏览器都支持，因此需处理兼容性。传统的无缝兼容需要后端支持，服务器根据 Accept 请求头决定是否返回 WebP 格式，从而实现同个 URL 返回不同格式的效果。

freecdn 可在前端实现这个功能，无需后端支持。[查看更多](docs/feature/README.md#WebP-无缝兼容)

## 资源快速更新

HTTP 的缓存时间，一直是个头疼的问题。时间太短，性能不够好；时间太长，更新不及时。因此很多网站都有自己的资源更新方案。

freecdn 使用独特的更新机制，只需更新一个清单文件，就能更新所有资源。[查看更多](docs/feature/README.md#资源快速更新)


# 功能演示

* [使用免费 CDN 加速公共资源](examples/pub-cdn/)

* [自动切换故障 CDN](examples/cdn-fallback/)

* [更新快速生效](examples/quick-update/)

* [使用免费 CDN 加速任意资源](examples/free-host/)

* [使用免费 CDN 加速清单文件](examples/ext-manifest/)

* [网站离线运行](examples/offline-site/)

* [WebP 自动适配](examples/webp-upgrade/)

* [POST 请求代理](examples/post-proxy/)

# 常用文档

* [命令行工具](docs/cli)

* [透明接入模式](docs/transparent-mode)

* [清单文件格式](docs/manifest)

* [解码参数列表](docs/manifest/params.md)


# 兼容问题

freecdn 前端脚本依赖 Service Worker API，并使用了 ES2020 语法和特性。不过即使浏览器不支持也没问题，页面仍从原始 URL 加载资源。

如果你的网站本身也有 Service Worker，请参考 [共享接入模式](docs/shared-mode/)。

由于 Service Worker 只能在安全环境中开启，因此你的站点必须是 HTTPS。本地测试（127.0.0.1/localhost）时可以使用 HTTP。


# 相关项目

* [freecdn-js](https://github.com/EtherDream/freecdn-js)：前端脚本

* [freecdn-publib](https://github.com/EtherDream/freecdn-publib)：公共库查询

* [freecdn-update-svc](https://github.com/EtherDream/freecdn-update-svc)：更新推送服务


# 项目进展

目前基本功能已实现，处于公开测试阶段。如果你对该项目感兴趣，可以在个人博客、特效演示等站点试验，期待反馈存在的问题，并提供更好的建议。

本项目将长期维护。


# 新功能...

目前开发中的功能：

* 更智能的站点选择算法（目前规则还很简单，需进一步完善）

* 大文件拆分（将大文件拆分成多个小文件，使用时自动合并。从而符合免费 CDN 的上传体积限制）

* 小文件合并（将多个小文件打包成一个大文件，使用自动提取。可减少零碎文件的请求数）

* 纯前端日志（通过 Service Worker 采集用户访问日志，发送到开发者提供的接口。适用于 GitHub Pages 等无法查看详细日志的站点）

* 子集搜索（如果待搜索文件是公共资源的一部分，工具生成裁剪范围；如果公共资源是待搜索文件的绝大部分，补充缺失的前缀或后缀数据）

* HTTP over WebRTC（将内网中的设备作为网站节点，分担流量和计算量）


# License

MIT