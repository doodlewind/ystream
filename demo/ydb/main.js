/* eslint-env browser */
import * as Ystream from '@y/stream'
import * as wscomm from '@y/stream/comms/ws'
import { initAuth, owner } from './auth.js'

export const collectionName = 'my-notes-app'
export const ystream = await Ystream.open('ydb-demo', {
  comms: [new wscomm.WebSocketComm('ws://localhost:9000', [{ owner, collection: collectionName }])]
})

await initAuth(ystream)

const collection = ystream.getCollection(owner, collectionName)
export const yroot = collection.getYdoc('index')
await yroot.whenLoaded
export const ynotes = yroot.getArray('notes')
