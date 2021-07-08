# 透明接入模式 - nginx

## 原理

参考 [透明接入模式](../../docs/transparent-mode/)。

## 核心配置

[freecdn-boot.conf](freecdn-boot.conf)

## 接入参考

[nginx.conf](nginx.conf)

## 本地演示

安装 nginx（这里使用 OpenResty）：

```bash
./install-nginx.sh
```

建议使用 Linux 或 macOS。

启动 nginx：

```bash
./run.sh
```

进入测试目录，创建前端脚本，生成清单文件：

```bash
cd ../pub-cdn/www
freecdn js --make
freecdn find --save
```

新建隐身窗口，打开控制台，网络栏勾选保留日志，方便观察细节。

访问 http://127.0.0.1:12345/

重启 nginx：

```bash
./run.sh reload
```

关闭 nginx：

```bash
./run.sh quit
```
