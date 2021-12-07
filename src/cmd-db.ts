import {Command} from 'commander'
import * as readline from 'readline'
import * as storage from './storage'
import * as util from './util'
import * as sqlite from 'sqlite3'


const DB_FILE = 'custom.db'

let mDatabase: sqlite.Database
let mWildCard = false

// escape sqlite wildcard (`_` and `%`)
const WC_SRC = /[_%]/g
const WC_ESC = '\t'

type field_t = 'hash' | 'url' | 'host' | ''

function genSql(input: string, field: field_t) {
  let expr = 'FROM table_urls'
  let vals = util.splitList(input)

  if (vals.length > 0) {
    expr += ' WHERE '

    if (mWildCard || field === 'host') {
      vals = vals.map(v => v
        .replace(WC_SRC, `${WC_ESC}$&`)
        .replace(/\*/g, '%')
      )
      if (field === 'host') {
        field = 'url'
        vals = vals.map(v => `http%://${v}/%`)
      }
      expr += vals.map(_ => `${field} LIKE ?`).join(' OR ')
      expr += ` ESCAPE "${WC_ESC}"`
    } else {
      expr += `${field} IN (` + vals.map(_ => '?') + ')'
    }
  }
  return {expr, vals}
}

function runSql(sql: string, params?: any) : Promise<any[]> {
  return new Promise((resolve, reject) => {
    mDatabase.all(sql, params, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}


function list(input: string, field: field_t) {
  const {vals, expr} = genSql(input, field)
  const N = 10000
  const sql = `SELECT hash AS h, url AS u ${expr} LIMIT ${N} OFFSET `

  function next(offset: number) {
    let str = ''

    mDatabase.each(sql + offset, vals,
      (err, row) => {str += `${row.h}\t${row.u}\n`},
      (err, num) =>
    {
      if (err) {
        console.error(err.message)
        return
      }
      if (num === 0) {
        return
      }
      process.stdout.write(str, err => {
        err || next(offset + N)
      })
    })
  }
  process.stdout.on('error', () => {
    /* do nothing */
  })
  next(0)
}

async function count(input: string, field: field_t) {
  const {vals, expr} = genSql(input, field)
  const r = await runSql(`SELECT COUNT(1) AS n ${expr}`, vals)
  console.log(r[0].n)
}

async function del(input: string, field: field_t) {
  const c1 = await getCount()

  const {vals, expr} = genSql(input, field)
  await runSql(`DELETE ${expr}`, vals)

  const c2 = await getCount()
  console.log(c1 - c2, 'records removed')
}

async function getCount() {
  const result: any = await runSql('SELECT COUNT(1) AS n FROM table_urls')
  return result[0].n
}

async function importOption() {
  const enum N {
    ROW_PER_TIME = 10000,
    COL = 2,
  }
  const c1 = await getCount()
  const reader = readline.createInterface({
    input: process.stdin
  })
  const vals: string[] = []
  let lineId = 0

  async function flush() {
    const num = vals.length / N.COL
    const holder = '(?,?),'.repeat(num - 1) + '(?,?)'
    const sql = 'INSERT OR REPLACE INTO table_urls VALUES ' + holder
    await runSql(sql, vals)
    vals.length = 0
  }

  for await (let line of reader) {
    lineId++
    line = line.trim()
    if (!line) {
      continue
    }
    // hash | SPACE | url
    const m = line.match(/^(\S+)\s+(.+)/)
    if (!m) {
      console.error('line:', lineId, 'missing delimiter')
      continue
    }
    const [, hash, url] = m

    if (!util.verifyHashB64(hash)) {
      console.error('line:', lineId, 'invalid hash:', hash)
      continue
    }
    if (!util.verifyUrl(url)) {
      console.error('line:', lineId, 'invalid url:', url)
      continue
    }
    if (vals.push(hash, url) > N.ROW_PER_TIME * N.COL) {
      await flush()
      console.log(lineId, 'lines parsed')
    }
  }
  if (vals.length > 0) {
    await flush()
  }
  const c2 = await getCount()
  console.log(c2 - c1, 'records added')
}

async function sqlOption(sql: string) {
  sql = sql.trim()
  if (!sql) {
    return
  }
  try {
    const result = await runSql(sql)
    if (result.length > 0) {
      console.table(result)
    }
  } catch (err: any) {
    console.error(err.message)
  }
}

async function init() {
  const file = storage.getPath(DB_FILE)
  if (!file) {
    return
  }
  mDatabase = new sqlite.Database(file)
  await runSql(`
    CREATE TABLE IF NOT EXISTS table_urls (
      hash TEXT NOT NULL,
      url TEXT NOT NULL PRIMARY KEY
    );
    CREATE INDEX IF NOT EXISTS idx_hash ON table_urls (
      hash
    );
  `)
}

export async function findHashes(hashB64s: string[]) {
  if (!mDatabase) {
    await init()
  }
  const val = hashB64s.join('","')
  const sql = `SELECT * FROM table_urls WHERE hash IN ("${val}")`
  const result = await runSql(sql)
  return result as {hash: string, url: string}[]
}

export async function run(args: any, program: Command) {
  await init()

  if (args.wildcard) {
    mWildCard = true
  }

  if (args.list) {
    return list('', '')
  }
  if (args.listHost) {
    return list(args.listHost, 'host')
  }
  if (args.listHash) {
    return list(args.listHash, 'hash')
  }
  if (args.listUrl) {
    return list(args.listUrl, 'url')
  }

  if (args.count) {
    return count('', '')
  }
  if (args.countHost) {
    return count(args.countHost, 'host')
  }
  if (args.countHash) {
    return count(args.countHash, 'hash')
  }
  if (args.countUrl) {
    return count(args.countUrl, 'url')
  }

  if (args.delHost) {
    return del(args.delHost, 'host')
  }
  if (args.delHash) {
    return del(args.delHash, 'hash')
  }
  if (args.delUrl) {
    return del(args.delUrl, 'url')
  }
  if (args.delAll) {
    return del('', '')
  }

  if (args.import) {
    return importOption()
  }
  if (args.sql) {
    return sqlOption(args.sql)
  }

  program.outputHelp()
}