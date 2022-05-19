import {Command} from 'commander'
import * as fs from 'fs'
import * as glob from 'glob'
import * as util from './util'
import {join as pathJoin} from 'path'


const IMAGE_EXTS = 'jpg,jpeg,png,apng,gif,ico,bmp'

type conf_t = {
  [file: string]: {
    [headerName: string] : string | number
  }
}

function verifyPackHeader(obj: conf_t) {
  for (const [file, conf] of Object.entries(obj)) {
    if (typeof conf !== 'object') {
      console.error('invalid file conf:', file)
      return false
    }
    for (const [headerName, headerValue] of Object.entries(conf)) {
      if (typeof headerValue !== 'string' && typeof headerValue !== 'number') {
        console.error('invalid header:', file, headerName)
        return false
      }
    }
  }
  return true
}

function packOption(
  input: string,
  filter: string,
  output: string,
  srcConfStr: string,
  imgUpgrade: boolean,
) {
  let srcConfMap: conf_t = {}
  if (srcConfStr) {
    if (!srcConfStr.startsWith('{')) {
      // 非 JSON 字符串，作为 JSON 文件路径
      const ret = util.readFile(srcConfStr)
      if (ret === null) {
        return
      }
      srcConfStr = ret
    }
    srcConfMap = util.parseJson(srcConfStr)

    if (!srcConfMap) {
      console.error('invalid json')
      return
    }
    if (typeof srcConfMap !== 'object') {
      console.error('invalid type')
      return
    }
    if (!verifyPackHeader(srcConfMap)) {
      return
    }
  }
  Object.setPrototypeOf(srcConfMap, null)

  let filePaths: string[]
  try {
    filePaths = glob.sync(filter, {
      nodir: true,
      cwd: input,
    })
  } catch (err: any) {
    console.error(err.message)
    return
  }

  const confMap: conf_t = {}
  let fileNum = 0
  let byteNum = 0

  if (!imgUpgrade) {
    // 假如存在 x.jpg, x.jpg.webp, x.jpg.avif，则排除后两个
    const imgExtSet = new Set(IMAGE_EXTS.split(','))
    const pathSet = new Set(filePaths)

    for (const path of filePaths) {
      const ext = util.getFileExt(path)
      if (imgExtSet.has(ext)) {
        if (pathSet.delete(path + '.webp')) {
          console.log('ignore:', path + '.webp')
        }
        if (pathSet.delete(path + '.avif')) {
          console.log('ignore:', path + '.avif')
        }
      }
    }
    filePaths = Array.from(pathSet)
  }

  for (const path of filePaths) {
    if (path === output) {
      continue
    }
    if (path.startsWith('freecdn-') || path.endsWith('.fcpkg')) {
      console.log('ignore:', path)
      continue
    }
    const stat = util.statFile(pathJoin(input, path))
    if (!stat) {
      continue
    }
    const headers = srcConfMap[path] || {}
    headers['content-length'] = stat.size
    confMap[path] = headers

    fileNum++
    byteNum += stat.size
  }

  const ostream = fs.createWriteStream(output)
  const pathArr = Object.keys(confMap).reverse()

  function writeNextFile() {
    const path = pathArr.pop()
    if (!path) {
      ostream.end()
      console.log(fileNum, 'files', byteNum.toLocaleString(), 'bytes')
      return
    }
    const istream = fs.createReadStream(pathJoin(input, path))

    istream.on('error', err => {
      console.error(err.message)
    })
    istream.on('end', () => {
      writeNextFile()
    })
    istream.pipe(ostream, {end: false})
  }

  const confStr = JSON.stringify(confMap) + '\r'

  ostream.write(confStr, err => {
    if (err) {
      console.error(err.message)
    } else {
      writeNextFile()
    }
  })
}

async function listOption(pkgPath: string) {
  const stream = fs.createReadStream(pkgPath)
  const confBufs: Buffer[] = []

  function parseConf(confMap: conf_t) {
    for (const [file, conf] of Object.entries(confMap)) {
      const len = +conf['content-length']
      if (!(len >= 0)) {
        console.error('invalid content-length:', file, len)
        break
      }
      console.log(file, conf)
    }
  }

  function onEnd() {
    console.error('missing file header')
  }

  stream.on('data', (chunk: Buffer) => {
    const pos = chunk.indexOf('\r')
    if (pos === -1) {
      confBufs.push(chunk)
      return
    }
    const tail = chunk.subarray(0, pos)
    confBufs.push(tail)

    const confStr = Buffer.concat(confBufs).toString()
    const confMap = util.parseJson(confStr)
    if (confMap) {
      parseConf(confMap)
    } else {
      console.error('invalid file header')
    }
    stream.off('end', onEnd)
    stream.close()
  })

  stream.on('end', onEnd)
}


export async function run(args: any, program: Command) {
  if (args.list) {
    listOption(args.list)
    return
  }
  if (!args.input || !args.output) {
    program.outputHelp()
    return
  }
  packOption(args.input, args.filter, args.output, args.headers || '', args.imgUpgrade)
}