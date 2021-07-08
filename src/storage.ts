import * as os from 'os'
import * as util from './util'


const BASE_DIR = process.env['FREECDN_STORAGE'] || `${os.homedir()}/.freecdn`

function checkDir() {
  const s = util.statFile(BASE_DIR)
  if (s) {
    if (s.isDirectory()) {
      return true
    }
    util.unlinkFile(BASE_DIR)
  }
  return util.mkdir(BASE_DIR)
}

export function getPath(file: string) {
  if (checkDir()) {
    return BASE_DIR + '/' + file
  }
}

export function read(file: string) {
  const fullPath = getPath(file)
  if (fullPath) {
    return util.readFile(fullPath, true)
  }
}

export function write(file: string, data: string | Buffer) {
  const fullPath = getPath(file)
  if (fullPath) {
    return util.writeFile(fullPath, data)
  }
  return false
}