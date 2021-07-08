import {createHash} from 'crypto'
import * as fs from 'fs'
import * as glob from 'glob'
import {findHashes as findCustomHashes} from './cmd-db'
import {findHashes as findPublicHashes} from './cmd-lib'
import {Manifest, FileConf} from './cmd-manifest'
import * as util from './util'


const BLOCK_SIZE = 1024 * 1024
const IMAGE_EXTS = 'jpg,jpeg,png,apng,gif,ico,bmp,webp,avif'
const MHASH_EXTS = process.env['FREECDN_MHASH_EXT'] ||
                  `${IMAGE_EXTS},pdf,webm,acc,ogg,flac,opus,m4a,mp4,mp3,wav`

const mMHashExts = new Set(MHASH_EXTS.split(','))
const mImageExts = new Set(IMAGE_EXTS.split(','))
const mImageFileSet = new Set<string>()

let mHostReg: RegExp | undefined
let mSilent = false

function log(...args: any[]) {
  mSilent || console.log(...args)
}

const mManifest = new Manifest()

interface FileInfo {
  hash: Buffer
  size: number
  blkHashes?: Buffer[] | null
}
interface HashInfo {
  files: string[]
  size: number
  blkHashes?: Buffer[]
  urls?: string[]
}
const mHashInfoMap = new Map<string, HashInfo>()
const mHashBins: Buffer[] = []


function addFoundUrl(hashB64: string, url: string) {
  if (mHostReg) {
    const host = util.getHostFromUrl(url)
    if (!mHostReg.test(host)) {
      return
    }
  }
  const hashInfo = mHashInfoMap.get(hashB64) as HashInfo
  if (!hashInfo.urls) {
    hashInfo.urls = []
  }
  if (!hashInfo.urls.includes(url)) {
    hashInfo.urls.push(url)
  }
}

async function findPublicDb() {
  const result = await findPublicHashes(mHashBins) || []

  for (const [hash, urls] of result) {
    for (const url of urls) {
      addFoundUrl(hash, url)
    }
  }
}

async function findCustomDb() {
  const hashB64s = [...mHashInfoMap.keys()]
  const result = await findCustomHashes(hashB64s) || []

  for (const {hash, url} of result) {
    addFoundUrl(hash, url)
  }
}

function addToManifest(file: string, hashB64: string, urls: string[]) {
  const fileConf = new FileConf()

  for (const url of urls) {
    if (url !== file) {
      fileConf.urls.add(url)
    }
  }
  if (fileConf.urls.size === 0) {
    return
  }

  const {blkHashes, size} = mHashInfoMap.get(hashB64) as HashInfo
  if (blkHashes) {
    const arr = blkHashes.map(util.encB64)
    fileConf.params.set('hash', BLOCK_SIZE + ';' + arr.join(','))
    fileConf.params.set('size', size + '')
  } else {
    fileConf.params.set('hash', hashB64)
  }

  mManifest.add(file, fileConf)
}


async function getStreamInfo(stream: NodeJS.ReadableStream) {
  const sha256 = createHash('sha256')
  let size = 0

  stream.on('data', chunk => {
    sha256.update(chunk)
    size += chunk.length
  })

  return new Promise<FileInfo | null>(callback => {
    stream.on('end', () => {
      const fileInfo: FileInfo = {
        hash: sha256.digest(),
        size,
      }
      callback(fileInfo)
    })
    stream.on('error', () => {
      callback(null)
    })
  })
}

function getStreamInfoWithBlkHashes(stream: NodeJS.ReadableStream) {
  const sha256 = createHash('sha256')
  const blkHashes: Buffer[] = []
  let size = 0

  stream.on('readable', () => {
    const blkData = stream.read(BLOCK_SIZE)
    if (!blkData) {
      return
    }
    sha256.update(blkData)
    size += blkData.length

    const blkHash = createHash('sha256').update(blkData).digest()
    blkHashes.push(blkHash)
  })

  return new Promise<FileInfo | undefined>(resolve => {
    stream.on('end', () => {
      const hash = sha256.digest()
      if (size > BLOCK_SIZE) {
        resolve({hash, size, blkHashes})
      } else {
        resolve({hash, size})
      }
    })
    stream.on('error', () => {
      resolve(undefined)
    })
  })
}

async function getLocalFileInfo(path: string) {
  const stream = fs.createReadStream(path)
  const ext = util.getFileExt(path)

  if (mImageExts.has(ext)) {
    mImageFileSet.add(path)
  }
  if (mMHashExts.has(ext)) {
    const stat = util.statFile(path)
    if (!stat) {
      return
    }
    if (stat.size > BLOCK_SIZE) {
      return await getStreamInfoWithBlkHashes(stream)
    }
  }
  return await getStreamInfo(stream)
}

async function getRemoteFileInfo(url: string) {
  const res = await util.request(url)
  if (!res) {
    return
  }
  const ext = util.getFileExt(url)
  if (mImageExts.has(ext)) {
    mImageFileSet.add(url)
  }
  const size = res.headers.get('content-length')
  if (size && +size < BLOCK_SIZE) {
    return await getStreamInfo(res.body)
  }
  if (mMHashExts.has(ext)) {
    return await getStreamInfoWithBlkHashes(res.body)
  }
  return await getStreamInfo(res.body)
}


function saveFileInfo(filePath: string, fileInfo: FileInfo) {
  const hashB64 = util.encB64(fileInfo.hash)

  let hashInfo = mHashInfoMap.get(hashB64)
  if (hashInfo) {
    hashInfo.files.push(filePath)
  } else {
    hashInfo = {
      files: [filePath],
      size: fileInfo.size,
    }
    if (fileInfo.blkHashes) {
      hashInfo.blkHashes = fileInfo.blkHashes
    }
    mHashInfoMap.set(hashB64, hashInfo)
    mHashBins.push(fileInfo.hash)
  }
}

function showUnmatched() {
  for (const {urls, files} of mHashInfoMap.values()) {
    if (urls) {
      continue
    }
    for (const file of files) {
      console.log(file)
    }
  }
}

async function loadFiles(filter: string) {
  let filePaths: string[]
  try {
    filePaths = glob.sync(filter, {
      nodir: true,
    })
  } catch (err) {
    log(err.message)
    return
  }
  log('check', filePaths.length, 'files ...')

  for (const filePath of filePaths) {
    if (
      filePath.startsWith('freecdn-internal/') ||
      filePath === 'freecdn-loader.min.js' ||
      filePath === 'freecdn-manifest.txt'
    ) {
      continue
    }
    const fileInfo = await getLocalFileInfo(filePath)
    if (!fileInfo) {
      log('failed to read', filePath.red)
      continue
    }
    saveFileInfo(filePath, fileInfo)
  }
}

async function loadUrls(file: string) {
  const text = util.readFile(file)
  if (text === null) {
    return
  }
  const urls = util.splitList(text)
  log('check', urls.length, 'urls ...')

  for (let url of urls) {
    url = util.stripUrlQuery(url)
    const fileInfo = await getRemoteFileInfo(url)
    if (!fileInfo) {
      log('failed to read', url.red)
      continue
    }
    saveFileInfo(url, fileInfo)
  }
}

const REG_IMG_UPGRADE = /(.+)\.(?:webp|avif)$/

function parseImageUpgrade() {
  let num = 0

  for (const file of mImageFileSet) {
    const m = file.match(REG_IMG_UPGRADE)
    if (!m) {
      continue
    }
    const prefix = m[1]
    if (REG_IMG_UPGRADE.test(prefix)) {
      // 排除 .webp.webp, .avif.webp, ...
      continue
    }
    if (!mImageFileSet.has(prefix)) {
      // 原文件不存在，或非图片格式
      continue
    }
    if (mManifest.has(prefix)) {
      // 原文件可加速，无需升级成 WebP/AVIF
      continue
    }
    if (mManifest.has(file)) {
      // WebP/AVIF 可加速，无需添加空配置
      continue
    }
    const conf = new FileConf()
    mManifest.add(file, conf)
    num++
  }

  if (num > 0) {
    log('found', num, 'upgradable images')
  }
}

export async function run(args: any) {
  if (args.showUnmatched) {
    mSilent = true
  }

  if (args.hosts) {
    mHostReg = util.domainsToReg(util.splitList(args.hosts))
    if (!mHostReg) {
      log('invalid domains')
      return
    }
  }

  if (args.withUrls) {
    await loadUrls(args.withUrls)
  }
  await loadFiles(args.filter)

  await findPublicDb()
  await findCustomDb()

  if (args.showUnmatched) {
    showUnmatched()
    return
  }

  let foundNum = 0

  for (const [hashB64, hashInfo] of mHashInfoMap) {
    if (!hashInfo.urls) {
      continue
    }
    for (const file of hashInfo.files) {
      log(file.green, 'hit', hashInfo.urls.length, 'urls')
      foundNum++
      if (args.save) {
        addToManifest(file, hashB64, hashInfo.urls)
      }
    }
  }
  log('found', foundNum, 'public files')

  parseImageUpgrade()

  if (args.save) {
    const path = (args.save === true) ? 'freecdn-manifest.txt' : args.save
    const data = mManifest.toString()
    if (util.writeFile(path, data)) {
      log('saved:', path)
    }
  }
}
