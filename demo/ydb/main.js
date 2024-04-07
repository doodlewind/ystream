/* eslint-env browser */
import * as ydb from '@y/stream'
import * as wscomm from '@y/stream/comms/ws'
import { initAuth, owner } from './auth.js'

export const collection = 'my-notes-app'
export const y = await ydb.openYdb('ydb-demo', [{ owner, collection }], {
  comms: [new wscomm.WebSocketComm('ws://localhost:9000')]
})

await initAuth(y)

export const yroot = y.getYdoc(owner, collection, 'index')
export const ynotes = yroot.getArray('notes')
