import {Command} from 'commander'
import * as freecdnJs from 'freecdn-js'
import {getPublicKey} from './cmd-key'
import * as util from './util'


const LOADER_DEV = 'freecdn-loader.js'
const LOADER_MIN = 'freecdn-loader.min.js'

const JS_VER = freecdnJs.ver

const CDN_URL_MAP: {[k: string]: string} = {
  elemecdn: `https://npm.elemecdn.com/freecdn-js@${JS_VER}/dist/freecdn-main.min.js`,
  unpkg: `https://unpkg.com/freecdn-js@${JS_VER}/dist/freecdn-main.min.js`,
  jsdelivr: `https://cdn.jsdelivr.net/npm/freecdn-js@${JS_VER}/dist/freecdn-main.min.js`,
}


async function getPublicKeyB64() {
  const keyBin = await getPublicKey()
  const keyB64 = util.encB64(keyBin)
  return keyB64.replace(/^MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE|==$/g, '')
}

function makeInternalFiles(dev: boolean) {
  const ver = dev ? 'dev' : freecdnJs.ver
  const dstDir = `freecdn-internal/${ver}/`

  if (!util.mkdir(dstDir)) {
    return
  }
  const make = dev ? util.linkFile : util.copyFile
  const list = dev ? freecdnJs.devFiles : freecdnJs.buildFiles

  for (const file of list) {
    const pos = file.lastIndexOf('/')
    if (pos !== -1) {
      const dir = dstDir + file.substring(0, pos)
      if (!util.mkdir(dir)) {
        return
      }
    }
    util.unlinkFile(dstDir + file)
    if (!make(freecdnJs.dir + file, dstDir + file)) {
      return
    }
  }
}

async function makeOption(dev: boolean, cdn: string) {
  const cdnUrls =
    cdn === '' ? Object.values(CDN_URL_MAP) :
    cdn === 'none' ? [] :
    util.splitList(cdn).map(v => CDN_URL_MAP[v] || v)

  for (const url of cdnUrls) {
    if (!util.verifyUrl(url)) {
      console.error('invalid url:', url)
      return
    }
  }

  const publicKey = await getPublicKeyB64()
  const loaderSrc = freecdnJs.dir + (dev ? LOADER_DEV : LOADER_MIN)
  const loaderTxt = util.readFile(loaderSrc)
  if (loaderTxt === null) {
    return
  }
  util.unlinkFile(LOADER_MIN)

  const code = loaderTxt
    .replace(/[A-Za-z0-9/+]{86}/, `${publicKey}`)
    .replace('CDN_URLS_PLACEHOLDER', JSON.stringify(cdnUrls))
    .replace('DELAY_PLACEHOLDER', cdnUrls.length ? '1000' : '0')

  if (dev) {
    if (!util.writeFile(loaderSrc, code)) {
      return
    }
    if (!util.linkFile(loaderSrc, LOADER_MIN)) {
      return
    }
  } else {
    if (!util.writeFile(LOADER_MIN, code)) {
      return
    }
  }
  makeInternalFiles(dev)
}

async function setupSwOption(file: string, dev: boolean) {
  const publicKey = await getPublicKeyB64()

  let sw = util.readFile(file)
  if (sw === null) {
    return
  }
  const delim = '// ----- freecdn end -----\n\n'
  sw = sw.split(delim).pop() as string

  const path = dev
    ? 'dev/freecdn-main.js'
    : `${freecdnJs.ver}/freecdn-main.min.js`

  const head = `\
// ----- freecdn begin -----
if (self.BigInt) {
  self.FREECDN_SHARED_MODE = true;
  self.FREECDN_PUBLIC_KEY = '${publicKey}';
  importScripts('/freecdn-internal/${path}');
} else {
  console.warn('freecdn is not installed because the browser is too old');
}
${delim}`

  if (!util.writeFile(file, head + sw)) {
    return
  }
  makeInternalFiles(dev)
}


export async function run(args: any, program: Command) {
  if (args.make) {
    await makeOption(args.dev, args.cdn || '')
    return
  }
  if (args.setupSw) {
    await setupSwOption(args.setupSw, args.dev)
    return
  }
  if (args.version) {
    console.log(JS_VER)
    return
  }
  program.outputHelp()
}