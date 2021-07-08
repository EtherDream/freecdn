ZLIB_VER=1.2.11
PCRE_VER=8.45
OPENSSL_VER=1.1.1k
OPENRESTY_VER=1.19.3.2

tmp=$(mktemp -d)
echo $tmp
cd $tmp

git clone https://github.com/google/ngx_brotli.git --recurse-submodules

curl -O https://zlib.net/zlib-$ZLIB_VER.tar.gz
curl -O https://ftp.pcre.org/pub/pcre/pcre-$PCRE_VER.tar.gz
curl -O https://www.openssl.org/source/openssl-$OPENSSL_VER.tar.gz
curl -O https://openresty.org/download/openresty-$OPENRESTY_VER.tar.gz

tar zxf pcre-*
tar zxf zlib-*
tar zxf openssl-*
tar zxf openresty-*

cd openresty-$OPENRESTY_VER

export PATH=$PATH:/sbin
export SYSTEM_VERSION_COMPAT=1

./configure \
  --with-http_v2_module \
  --with-http_ssl_module \
  --with-http_sub_module \
  --with-http_gzip_static_module \
  --with-openssl=../openssl-$OPENSSL_VER \
  --with-zlib=../zlib-$ZLIB_VER \
  --with-pcre=../pcre-$PCRE_VER \
  --with-pcre-jit \
  --add-module=../ngx_brotli

make
sudo make install
rm -rf $tmp

sudo setcap CAP_NET_BIND_SERVICE=+eip /usr/local/openresty/nginx/sbin/nginx
echo "nginx installed"