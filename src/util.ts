import * as fs from 'fs'
import * as dns from 'dns'
import * as https from 'https'
import fetch from 'node-fetch'


// eslint-disable-next-line
export const ver = require('../package.json').version

export function readFile(file: string, silent = false) {
  const ret = readFileBin(file, silent)
  return ret && ret.toString()
}

export function readFileBin(file: string, silent = false) {
  try {
    return fs.readFileSync(file)
  } catch (err: any) {
    silent || console.error(err.message)
    return null
  }
}

export function writeFile(path: string, data: string | Buffer) {
  try {
    fs.writeFileSync(path, data)
    return true
  } catch (err: any) {
    console.error(err.message)
    return false
  }
}

export function unlinkFile(path: string) {
  try {
    fs.unlinkSync(path)
    return true
  } catch {
    return false
  }
}

export function mkdir(path: string) {
  try {
    fs.mkdirSync(path, {recursive: true})
    return true
  } catch (err: any) {
    console.error(err.message)
    return false
  }
}

export function statFile(path: string) {
  try {
    return fs.statSync(path)
  } catch (err: any) {
  }
}

export function copyFile(src: string, dst: string) {
  try {
    fs.copyFileSync(src, dst)
    return true
  } catch (err: any) {
    console.error(err.message)
    return false
  }
}

export function linkFile(src: string, dst: string) {
  try {
    fs.linkSync(src, dst)
    return true
  } catch (err: any) {
    console.error(err.message)
    return false
  }
}

const mFetchHeaders: {[k: string]: string} = {}
let mHttpsAgent: https.Agent
let mFetchInied = false

function initFetch() {
  if (mFetchInied) {
    return
  }
  mFetchHeaders['accept-encoding'] = 'gzip, deflate, br'
  mFetchHeaders['user-agent'] = 'freecdn-cli/' + ver

  for (const [k, v] of Object.entries(process.env)) {
    const m = k.match(/^FREECDN_HTTP_(.+)/)
    if (m) {
      const name = m[1].toLowerCase().replace(/_/g, '-')
      if (v) {
        mFetchHeaders[name] = v
      } else {
        delete mFetchHeaders[name]
      }
    }
  }

  const RESOVLE = process.env['FREECDN_RESOLVE']
  if (RESOVLE) {
    const family = +RESOVLE
    const rrtype = family === 4 ? 'A' : 'AAAA'

    mHttpsAgent = new https.Agent({
      lookup(hostname, opt, callback) {
        dns.resolve(hostname, rrtype, (err, addrs: any) => {
          callback(err, addrs[0], family)
        })
      }
    })
  }
  mFetchInied = true
}


export async function request(...args: Parameters<typeof fetch>) {
  initFetch()

  const url = args[0]
  let opt = args[1]
  if (!opt) {
    opt = {}
  }
  opt.headers = mFetchHeaders
  if (mHttpsAgent) {
    console.assert(/^https:/.test(url + ''))
    opt.agent = mHttpsAgent
  }
  try {
    return await fetch(url, opt)
  } catch (err: any) {
    console.error(err.message)
  }
}

export function parseJson(str: string) {
  try {
    return JSON.parse(str)
  } catch {
  }
}

export function decB64(str: string) {
  return Buffer.from(str, 'base64')
}

export function encB64(buf: Buffer) {
  return buf.toString('base64')
}

export function isHttp(url: string) {
  return /^https?:/.test(url)
}

export function splitList(str: string) {
  str = str.trim()
  if (!str) {
    // NOTICE: ''.split(/\s+/) got ['']
    return []
  }
  return str.split(/\s+/)
}

export function getHostFromUrl(url: string) {
  const m = url.match(/^https?:\/\/([^/]+)/i)
  if (m) {
    return m[1]
  }
  return ''
}

export function domainsToReg(domains: string[]) {
  const exps = domains.map(v => v
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.+')
  )
  try {
    return RegExp('^' + exps.join('|') + '$')
  } catch {
  }
}

export function stripUrlQuery(url: string) {
  const pos = url.indexOf('?')
  if (pos === -1) {
    return url
  }
  return url.substring(0, pos)
}

export function getFileExt(url: string) {
  const pos = url.lastIndexOf('.')
  if (pos === -1) {
    return ''
  }
  return url.substring(pos + 1)
}

export function getPair(
  str: string,
  char: string
) : [string, string | null]
{
  const pos = str.indexOf(char)
  if (pos === -1) {
    return [str, null]
  }
  return [
    str.substring(0, pos),
    str.substring(pos + char.length)
  ]
}

const REG_SHA256_B64 = /^[A-Za-z0-9+/]{43}=$/
const REG_SHA256_HEX = /^[A-Fa-f0-9]{64}$/

export function verifyHashB64(value: string) {
  return REG_SHA256_B64.test(value)
}

export function verifyHashHex(value: string) {
  return REG_SHA256_HEX.test(value)
}

export function verifyUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}