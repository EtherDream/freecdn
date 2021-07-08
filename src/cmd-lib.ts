import * as freecdnPubLib from 'freecdn-publib'
import * as util from './util'


function listOption() {
  try {
    freecdnPubLib.dump()
  } catch (err) {
    console.error(err.message)
  }
}

async function queryOption(hashes: string) {
  const hashBins = util.splitList(hashes).map(value => {
    if (!util.verifyHashB64(value)) {
      console.error('invalid SHA-256 base64 string:', value)
      process.exit(1)
    }
    return util.decB64(value)
  })

  const result = await findHashes(hashBins)
  if (!result) {
    console.log('no result')
    return
  }

  for (const [hash, urls] of result) {
    const num = String(urls.length).yellow
    console.log(hash.green, '(' + num + ')')

    for (const url of urls) {
      console.log('\t' + url)
    }
  }
}

export function findHashes(hashBins: Buffer[]) {
  try {
    return freecdnPubLib.findHashes(hashBins)
  } catch (err) {
    console.error(err.message)
  }
}

export async function run(args: any) {
  if (args.list) {
    listOption()
    return
  }
  if (args.query) {
    await queryOption(args.query)
    return
  }

  const info = freecdnPubLib.getInfo()
  console.log('v' + info.ver + ' (' + info.mtime + ')')
  console.log('urls:', info.total)
  console.table(info.sites)
  console.log(`see: https://github.com/EtherDream/freecdn-publib/tree/${info.ver}`)
}