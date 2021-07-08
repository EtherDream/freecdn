# 简介

freecdn 命令行工具。


# 安装

需要 Node.js v15+。

```bash
npm install freecdn -g
```

# 功能

## 子命令

* [find](#find) 搜索公共资源

* [js](#js) 生成前端文件

* [manifest](#manifest) 清单文件操作

* [db](#db) 维护数据库

* [lib](#lib) 查看公共库

* [key](#key) 维护密钥


## find

搜索当前目录下哪些文件可通过公共 CDN 加速：

```bash
freecdn find
```

搜索过程无需联网，常用的公共库信息已记录在本地文件中。如需更新公共库信息，升级本程序即可。

如需搜索私有文件，参考 [db import](#import)。

### filter

过滤需搜索的文件，使用 glob 格式。例如只搜索 js 文件：

```bash
freecdn find --filter "**/*.js"
```

例如排除 php、aspx 文件：

```bash
freecdn find --filter "**/!(*.php|*.aspx)"
```

### save

保存搜索结果，默认 `freecdn-manifest.txt`。可自定义保存路径：

```bash
freecdn find --save full.txt
```

### with-urls

指定外部 URL 列表文件。程序默认只搜索本地文件，如需支持外部 URL，则需提供一个 URL 列表。[参考案例](https://github.com/EtherDream/freecdn/tree/master/examples/cdn-fallback)。

### hosts

只用指定站点的资源，多个使用空白符分隔。例如只用 unpkg 和 jsdelivr 的资源：

```bash
freecdn find --hosts "unpkg.com cdn.jsdelivr.net"
```

### show-unmatched

显示无法搜到的文件（既不在公共库，也不在自定义数据库）。用于列出哪些文件需发布到 CDN。


## js

### make

创建前端文件（必须位于站点根目录）：

```bash
freecdn js --make
```

前端文件包括 `freecdn-loader.min.js` 以及 `freecdn-internal/`：

* `freecdn-loader.min.js` 硬编码了当前公钥，因此该文件的内容是不固定的。不要使用之前遗留的文件，总是用该命令生成文件。

* `freecdn-internal/` 下可能存在多个版本的目录，以防极少数用户仍在使用旧的资源。你可以手动删除那些很久以前的版本目录。

### setup-sw

如果当前站点已存在 Service Worker，需使用该选项安装。参考 [共享模式](../docs/shared-mode/)。


## manifest

操作清单文件。

### input

输入清单文件，默认为 `freecdn-manifest.txt`。

### output

输出清单文件，默认和输入文件相同。

### sign

对输入清单进行签名，保存到输出清单：

```bash
freecdn manifest --sign
```

签名结果附加在清单末尾。[案例参考](../examples/offline-site)

### verify-sign

校验输入清单的签名是否正确。

### merge

将指定的清单合并到输入清单，保存到输出清单。如果存在同样的配置，则会将其覆盖。

通常用于为指定的 URL 添加配置。[案例参考](../examples/cdn-fallback)


## db

### list-url

查看指定 URL 的记录，多个值使用空白符分隔：

```bash
freecdn db --list-url "https://foo/1.js https://bar/2.js"
```

开启 wildcard 选项后，使用 `*` 可匹配任意数量的字符：

```bash
freecdn db --list-url "https://cdn.jsdelivr.net/gh/*" --wildcard
```

### list-hash

查看指定 Hash 的记录，格式和上述相同。

### list-host

查看指定站点的记录，格式和上述相同。host 相关的操作自动开启 wildcard。

```bash
freecdn db --list-host "*.foo.com"
```

> 含有 `*` 的参数建议使用引号，以防被 Shell 展开成相应的文件名。

### import

导入文件 Hash 和 URL 到数据库，之后执行 `freecdn find` 时可搜到这些文件。

```bash
freecdn db --import <<< "
9JXzTk8XfPARWvmVu7/rP8q8iFAodudvxRpKtDm8hDE= https://foo.com/1.gif
6VA0SGkrc43SYPvX98q/LhHwm2APqX5us6Vuulsafps= https://foo.com/2.gif
6VA0SGkrc43SYPvX98q/LhHwm2APqX5us6Vuulsafps= https://foo.com/3.gif#pos=100
"
```

数据库保存在 `~/.freecdn/custom.db`，使用 SQLite 格式。`table_urls` 表结构：

* hash (TEXT 类型。文件内容 SHA-256 Base64)

* url（TEXT 类型，不可重复）

可通过 `sqlite3` 命令操作数据库，例如导入记录：

```bash
sqlite3 ~/.freecdn/custom.db <<< "
.mode tabs
.import records.txt table_urls
"
```

对于大量记录，这种方式更高效。

### sql

可执行自定义 SQL。注意不要破坏表结构。

### 其他功能

参考 `freecdn db -h`。


## lib

显示公共库信息。

### query

查询 Hash 对应的 URL，使用 Base64 格式。一次可查询多个，使用空白字符分隔。

```bash
freecdn lib --query "
  qRgUkISo5k/bgIWNHGfLsC8WmasnE7jYdCZvthIFLno=
  DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=
"
```

### list

显示所有记录，字段使用 Tab 分隔。导出到文件：

```bash
freecdn lib --list > records.txt
```

输出结果约有 1000 万行，1GB 以上。

由于数据量较大，公共库信息未使用数据库，而是使用更紧凑的自定义格式存储在压缩文件中，只能导出不能导入。详细查看 [freecdn-publib](https://www.npmjs.com/package/freecdn-publib)。


## key

查看密钥

### public

查看公钥：

```bash
freecdn key --public
```

公钥长度为 91 字节，Base64 编码后 124 个字符。

执行 `freecdn js --make` 时公钥会被填入 `freecdn-loader.min.js` 文件中。

为了减少体积，脚本中的公钥删除了 `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE` 前缀和 `==` 后缀，Base64 为 86 个字符。

### private

查看私钥：

```bash
freecdn key --private
```

私钥用于为清单签名，参考 [manifest sign](#sign)。私钥不要对外暴露。

### update

更新密钥：

```bash
freecdn key --update
```

密钥更新后，重新生成前端脚本时，清单也需重新签名（如果之前存在签名），以保持两者一致。

> 密钥存储在 `~/.freecdn/key.json`


# 环境变量

## 存储路径

使用 `FREECDN_STORAGE` 可重定义存储路径。例如：

```bash
export FREECDN_STORAGE=~/hello
freecdn key
freecdn db -l
```

密钥文件和数据库文件都保存在 `~/hello` 目录中，而不是默认的 `~/.freecdn`。

## 请求头

使用 `FREECDN_HTTP_` 前缀的变量可定义 HTTP 请求头。例如：

```bash
export FREECDN_HTTP_REFERER="https://foo.com/"
export FREECDN_HTTP_USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36"
```

程序产生的 HTTP 请求头包含 referer 和 user-agent。名称转成小写，`_` 转成 `-`。

## 域名查询

使用 `FREECDN_RESOLVE` 可忽略本地 hosts 解析，并指定域名类型。值为 `4` 使用 IPv4，`6` 使用 IPv6。


# 卸载

```bash
npm uninstall freecdn -g
rm -rf ~/.freecdn
```
