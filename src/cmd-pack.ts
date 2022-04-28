import * as zlib from 'zlib'
import * as glob from 'glob'
import * as util from './util'
import {join as pathJoin} from 'path'

const MAX_BUNDLE_LEN = 1024 * 1024 * 50
const MAGIC = Buffer.from('#PACKv1\n')


function packOption(input: string, filter: string, output: string) {
  if (!output) {
    console.error('missing output file')
    return
  }

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

  const bufs: Buffer[] = []
  let headerStr = ''
  let sum = 0

  for (const path of filePaths) {
    if (path === output) {
      continue
    }
    if (path.startsWith('freecdn-')) {
      continue
    }
    const data = util.readFileBin(pathJoin(input, path))
    if (!data) {
      continue
    }
    sum += data.length
    if (sum > MAX_BUNDLE_LEN) {
      console.warn('MAX_BUNDLE_LEN reached')
      break
    }
    bufs.push(data)
    headerStr += path + ':' + data.length + '\n'
  }

  const fileNum = bufs.length

  const headerBuf = Buffer.from(headerStr + '\r')
  bufs.unshift(MAGIC, headerBuf)

  const buf = Buffer.concat(bufs)
  util.writeFile(output, buf)

  console.log(fileNum, 'files', buf.length.toLocaleString(), 'bytes')
}

function listOption(input: string) {
  const data = util.readFileBin(input)
  if (!data) {
    return
  }
  const pos = data.indexOf(13 /* '\r' */)
  if (pos === -1) {
    console.error('missing file header')
    return
  }
  const headerStr = data.toString('utf-8', 0, pos)
  const bodyBuf = data.subarray(pos + 1)

  if (!headerStr.startsWith('#PACKv1\n')) {
    console.error('bad magic code')
    return
  }
  const lines = headerStr.slice(8, -1).split('\n')

  let offset = 0

  for (const line of lines) {
    const pos = line.lastIndexOf(':')
    if (pos === -1) {
      console.error('missing len')
      continue
    }
    const len = +line.substring(pos + 1)
    if (!(len >= 0)) {
      console.error('invalid file len:', len)
      continue
    }
    if (offset + len > bodyBuf.length) {
      console.error('invalid offset')
      return
    }
    offset += len

    const path = line.substring(0, pos)
    console.log(path, len)
  }
}


export async function run(args: any) {
  if (args.list) {
    listOption(args.list)
    return
  }
  packOption(args.input, args.filter, args.output)
}