import {webcrypto} from 'crypto'
import * as storage from './storage'
import * as util from './util'

// @ts-ignore
const subtle: SubtleCrypto = webcrypto.subtle

let mPublicKeyBuf: Buffer
let mPrivateKeyBuf: Buffer

let mPublicKey: any
let mPrivateKey: any


async function init() {
  if (loadKey()) {
    await importKey()
  } else {
    await genKey()
  }
}

function loadKey() {
  const data = storage.read('key.json')
  if (!data) {
    return false
  }
  const json = util.parseJson(data)
  if (!json || !json.publicKey || !json.privateKey) {
    return false
  }
  mPublicKeyBuf = util.decB64(json.publicKey)
  mPrivateKeyBuf = util.decB64(json.privateKey)

  return mPublicKeyBuf.length === 91 && mPrivateKeyBuf.length === 138
}

function saveKey() {
  const json = {
    publicKey: util.encB64(mPublicKeyBuf),
    privateKey: util.encB64(mPrivateKeyBuf),
  }
  const data = JSON.stringify(json, null, 2)
  return storage.write('key.json', data)
}

async function genKey() {
  const pair = await subtle.generateKey({
    name: 'ECDSA',
    namedCurve: 'P-256'
  }, true, [])

  const publicKeyBuf = await subtle.exportKey('spki', pair.publicKey as CryptoKey)
  const privateKeyBuf = await subtle.exportKey('pkcs8', pair.privateKey as CryptoKey)
  mPublicKeyBuf = Buffer.from(publicKeyBuf)
  mPrivateKeyBuf = Buffer.from(privateKeyBuf)
  saveKey()
  await importKey()
}

async function importKey() {
  mPublicKey = await subtle.importKey('spki', mPublicKeyBuf, {
    name: 'ECDSA',
    namedCurve: 'P-256',
  }, false, ['verify'])

  mPrivateKey = await subtle.importKey('pkcs8', mPrivateKeyBuf, {
    name: 'ECDSA',
    namedCurve: 'P-256'
  }, false, ['sign'])
}


export async function sign(data: Buffer) {
  if (!mPublicKey) {
    await init()
  }
  const arrayBuffer = await subtle.sign({
    name: 'ECDSA',
    hash: {
      name: 'SHA-256'
    },
  }, mPrivateKey, data)

  return Buffer.from(arrayBuffer)
}

export async function verify(sign: Buffer, data: Buffer) {
  if (!mPublicKey) {
    await init()
  }
  return await subtle.verify({
    name: 'ECDSA',
    hash: {
      name: 'SHA-256'
    },
  }, mPublicKey, sign, data)
}

export async function getPublicKey() {
  if (!mPublicKey) {
    await init()
  }
  return mPublicKeyBuf
}

export async function run(args: any) {
  await init()

  if (args.public) {
    console.log(util.encB64(mPublicKeyBuf))
    return
  }
  if (args.private) {
    console.log(util.encB64(mPrivateKeyBuf))
    return
  }
  if (args.update) {
    await genKey()
    return
  }

  console.log('public:', util.encB64(mPublicKeyBuf))
  console.log('private:', util.encB64(mPrivateKeyBuf))
}