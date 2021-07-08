import {Command} from 'commander'
import * as util from './util'
import * as key from './cmd-key'


function toRelPath(file: string) {
  if (file[0] !== '@') {
    return util.isHttp(file) ? file : ('/' + file)
  }
  return file
}

export class FileConf {
  public urls = new Set<string>()
  public params = new Map<string, string>()
}

export class Manifest {
  private readonly map = new Map<string, FileConf>()

  public static parse(text: string) {
    const m = new Manifest()
    let conf: FileConf | undefined
    let lineId = 0

    for (const line of text.split('\n')) {
      lineId++
      const str = line.trim()
      if (!str || str[0] === '#') {
        continue
      }
      // filename line (no indent)
      if (/^\S/.test(line)) {
        conf = new FileConf()
        m.map.set(str, conf)
        continue
      }
      // url or param line
      if (!conf) {
        console.error('invalid conf. line:', lineId)
        return
      }

      if (/^https?:|^\//.test(str)) {
        conf.urls.add(str)
      } else {
        const [k, v] = util.getPair(str, '=')
        if (v) {
          conf.params.set(k, v)
        }
      }
    }
    return m
  }

  public add(file: string, conf: FileConf) {
    const key = toRelPath(file)
    this.map.set(key, conf)
  }

  public has(file: string) {
    const key = toRelPath(file)
    return this.map.has(key)
  }

  public merge(other: Manifest) {
    for (const [key, file2] of other.map) {
      const file1 = this.map.get(key)
      if (!file1) {
        this.map.set(key, file2)
        continue
      }
      for (const url of file2.urls) {
        file1.urls.add(url)
      }
      for (const [k, v] of file2.params) {
        file1.params.set(k, v)
      }
    }
  }

  public static async sign(text: string) {
    const buf = await key.sign(Buffer.from(text))
    const signB64 = util.encB64(buf)
    return text + '\n# SIGN: ' + signB64
  }

  public toString() {
    let s = ''

    for (const [key, conf] of this.map) {
      s += key + '\n'

      for (const url of conf.urls) {
        s += '\t' + url + '\n'
      }
      for (const [k, v] of conf.params) {
        s += '\t' + k + '=' + v + '\n'
      }
      s += '\n'
    }
    return s.slice(0, -1)
  }
}

function getSignAndData(text: string) {
  const m = text.match(/\n# SIGN: ([A-Za-z0-9+/=]{88})$/)
  if (!m) {
    return {data: text}
  }
  return {
    sign: m[1],
    data: text.slice(0, -m[0].length)
  }
}

async function mergeOption(srcFile: string, mergeFile: string, dstFile: string) {
  const text = util.readFile(srcFile)
  if (text === null) {
    return
  }
  const mergeText = util.readFile(mergeFile)
  if (mergeText === null) {
    return
  }
  const {sign, data} = getSignAndData(text)
  const m1 = Manifest.parse(data)
  const m2 = Manifest.parse(mergeText)
  if (!m1 || !m2) {
    return
  }
  m1.merge(m2)

  let dstText = m1.toString()
  if (sign) {
    dstText = await Manifest.sign(dstText)
  }
  util.writeFile(dstFile, dstText)
}

async function updateSignOption(srcFile: string, dstFile: string) {
  const text = util.readFile(srcFile)
  if (text === null) {
    return
  }
  const {data} = getSignAndData(text)
  const newText = await Manifest.sign(data)
  util.writeFile(dstFile, newText)
}

async function verifySignOption(srcFile: string) {
  const text = util.readFile(srcFile)
  if (text === null) {
    return
  }
  const {sign, data} = getSignAndData(text)
  if (!sign) {
    console.error('signature not existed')
    return
  }
  const signBuf = util.decB64(sign)
  const dataBuf = Buffer.from(data)

  if (await key.verify(signBuf, dataBuf)) {
    console.log('signature correct')
  } else {
    console.log('signature incorrect')
  }
}


export async function run(args: any, program: Command) {
  const srcFile = args.input
  const dstFile = args.output || srcFile

  if (args.sign) {
    return await updateSignOption(srcFile, dstFile)
  }
  if (args.verifySign) {
    return await verifySignOption(srcFile)
  }
  if (args.merge) {
    return await mergeOption(srcFile, args.merge, dstFile)
  }

  program.outputHelp()
}