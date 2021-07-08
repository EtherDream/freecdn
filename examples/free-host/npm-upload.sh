if [[ "$NPM_PKG" == "" ]]; then
  echo "\$NPM_PKG is not specified"
  exit
fi

if [[ "$*" == "" ]]; then
  echo "file list empty"
  exit
fi

for file in $*; do
  hash=$(openssl dgst -sha256 -binary $file | openssl base64 -A)
  key=$(sed 's/[^a-zA-Z0-9]//g' <<< $hash | head -c 16)

  path=$NPM_PKG@0.0.0-$key/index.js
  url1=https://unpkg.com/$path
  url2=https://cdn.jsdelivr.net/npm/$path

  echo "upload: $file ($hash)"

  list="$list
$hash $url1
$hash $url2"

  str=$(curl -sI $url1 | head -n1)
  if [[ $str =~ "200" ]]; then
    echo "file existed: $url1"
    continue
  fi

  dst=$(mktemp -d)
  cp $file $dst/index.js

  echo '{"name":"'$NPM_PKG'","version":"0.0.0-'$key'"}' > $dst/package.json
  npm publish $dst

  echo "uploaded: $url1"
  rm -rf $dst
done

freecdn db --import <<< "$list"