# 简介

本文讲解如何在已存在 Service Worker 的情况下接入 freecdn。


# 接入

如果你的站点已存在 Service Worker，那么在页面中引入 freecdn 脚本将不会起作用。

你需要将 freecdn 脚本插入到现有的 Service Worker 脚本中，从而让两者共同运行。假设你的 Service Worker 文件为 `sw.js`，执行如下命令：

```bash
freecdn js --setup-sw sw.js
```

从而将 freecdn 脚本插入到 `sw.js` 头部，使两者共用同一个 Service Worker，所以称之共享接入模式。


# 机制

该模式下 freecdn 不会监听 fetch 事件，请求拦截等逻辑仍由原 Service Worker 实现。

freecdn 会重写网络相关的 API，从而接管原 Service Worker 的网络访问。目前重写的 API 有：

* fetch()

* Cache.prototype.add()

* Cache.prototype.addAll()

* Response.prototype.url

# 细节

共享接入模式下 freecdn 不会使用 Cache Storage 缓存资源，因为原 Service Worker 可能也会使用 Cache Stoage，导致同个资源被缓存了两次。

此外 performance.getEntries() 的记录不会被清空，以防原 Service Worker 可能用到。（普通模式下每次分析后会清空记录）


# 备注

使用共享接入模式后，不可使用透明接入模式。
