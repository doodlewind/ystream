import * as Y from 'yjs'
import * as map from 'lib0/map'
import { bindydoc } from './bindydoc.js'
import * as promise from 'lib0/promise'
import * as isodb from 'isodb' // eslint-disable-line
import * as db from './db.js' // eslint-disable-line
import { ObservableV2 } from 'lib0/observable'
import * as random from 'lib0/random'
import * as actions from './actions.js'
import * as dbtypes from './dbtypes.js' // eslint-disable-line
import * as bc from 'lib0/broadcastchannel'
import * as operations from './operations.js'
import * as buffer from 'lib0/buffer'

/**
 * @typedef {Object} YstreamConf
 * @property {Array<import('./comm.js').CommConfiguration>} [YstreamConf.comms]
 * @property {boolean} [YstreamConf.acceptNewUsers]
 * @property {boolean} [YstreamConf.syncsEverything]
 */

/**
 * @param {dbtypes.OpValue} a
 * @param {dbtypes.OpValue} b
 */
const _sortOpsHelper = (a, b) => a.localClock - b.localClock

/**
 * @param {Ystream} ystream
 * @param {Array<dbtypes.OpValue>} ops
 * @param {any} origin
 */
const _emitOpsEvent = (ystream, ops, origin) => {
  if (ops.length === 0) {
    return
  }
  const eclock = ystream._eclock
  ops.sort(_sortOpsHelper)
  if (eclock == null || ops[0].localClock === eclock) {
    ystream.emit('ops', [ops, origin, true])
    ystream._eclock = ops[ops.length - 1].localClock + 1
  } else {
    // error.unexpectedCase()
    console.warn('Ops are applied in wrong order - @todo')
    ystream.emit('ops', [ops, origin, true])
    ystream._eclock = ops[ops.length - 1].localClock + 1
  }
}

/**
 * @param {Ystream} ystream
 * @param {Array<dbtypes.OpValue>} ops
 * @param {any} origin
 */
export const emitOpsEvent = (ystream, ops, origin) => {
  if (ops.length > 0) {
    _emitOpsEvent(ystream, ops, origin)
    bc.publish('@y/stream#' + ystream.dbname, ops.map(op => op.localClock), ystream)
  }
}

/**
 * @extends ObservableV2<{ ops:function(Array<dbtypes.OpValue>,any,boolean):void, authenticate:function():void, "collection-opened":(collection:Collection)=>void }>
 */
export class Ystream extends ObservableV2 {
  /**
   * @param {string} dbname
   * @param {isodb.IDB<typeof db.def>} _db
   * @param {dbtypes.UserIdentity|null} user
   * @param {dbtypes.DeviceClaim|null} deviceClaim
   * @param {YstreamConf} conf
   */
  constructor (dbname, _db, user, deviceClaim, { comms = [], acceptNewUsers = false, syncsEverything = false } = {}) {
    super()
    this.dbname = dbname
    /**
     * @type {isodb.IDB<typeof db.def>}
     */
    this._db = _db
    this.acceptNewUsers = acceptNewUsers
    /**
     * @type {Map<string,Map<string,Collection>>}
     */
    this.collections = new Map()
    /**
     * Whether to sync all collections (usually only done by a server)
     */
    this.syncsEverything = syncsEverything
    this.clientid = random.uint32()
    /**
     * @type {dbtypes.UserIdentity|null}
     */
    this.user = user
    /**
     * @type {dbtypes.DeviceClaim|null}
     */
    this.deviceClaim = deviceClaim
    /**
     * Instance is authenticated once a user identity is set and the device claim has been set.
     */
    this.isAuthenticated = false
    this.whenAuthenticated = promise.create(resolve => this.once('authenticate', resolve))
    /**
     * Clock of latest emitted clock.
     * @type {number|null}
     */
    this._eclock = null
    /**
     * Subscribe to broadcastchannel event that is fired whenever an op is added to the database.
     */
    this._esub = bc.subscribe('@y/stream#' + this.dbname, /** @param {Array<number>} opids */ async (opids, origin) => {
      if (origin !== this) {
        console.log('received ops via broadcastchannel', opids[0])
        // @todo reintroduce pulling from a database
        // const ops = await actions.getOps(this, opids[0])
        // _emitOpsEvent(this, ops, 'broadcastchannel')
      }
    })
    /**
     * @type {Set<import('./comm.js').Comm>}
     */
    this.comms = new Set()
    /**
     * @type {Set<import('./comm.js').CommHandler>}
     */
    this.commHandlers = new Set()
    this.whenAuthenticated.then(() => {
      console.log(this.clientid.toString(36) + ': connecting to server')
      comms.forEach(comm =>
        this.commHandlers.add(comm.init(this))
      )
    })
    this._tr = null
    /**
     * @type {Array<Promise<any>>}
     */
    this._childTrs = []
  }

  /**
   * @param {string} owner
   * @param {string} collection
   */
  getCollection (owner, collection) {
    return map.setIfUndefined(map.setIfUndefined(this.collections, owner, map.create), collection, () => new Collection(this, owner, collection))
  }

  /**
   * @template T
   * @param {(tr:import('isodb').ITransaction<typeof import('./db.js').def>) => Promise<T>} f
   * @return {Promise<T>}
   */
  transact (f) {
    return this._db.transact(async tr => {
      this._tr = tr
      let res
      try {
        res = await f(tr)
        while (this._childTrs.length > 0) {
          const p = promise.all(this._childTrs)
          this._childTrs = []
          await p
        }
      } finally {
        this._tr = null
        this._childTrs = []
      }
      return res
    })
  }

  /**
   * @template T
   * @param {(tr:import('isodb').ITransaction<typeof import('./db.js').def>) => Promise<T>} f
   * @return {Promise<T>}
   */
  childTransaction (f) {
    if (this._tr) {
      const p = f(this._tr)
      this._childTrs.push(p)
      return p
    }
    return this.transact(f)
  }

  destroy () {
    this.collections.forEach(owner => {
      owner.forEach(collection => {
        collection.destroy()
      })
    })
    this.comms.forEach(comm => comm.destroy())
    bc.unsubscribe('@y/stream#' + this.dbname, this._esub)
    return this._db.destroy()
  }
}

/**
 * @extends ObservableV2<{ sync:function():void, ops:function(Array<dbtypes.OpValue>,any,boolean):void }>
 */
export class Collection extends ObservableV2 {
  /**
   * @param {Ystream} stream
   * @param {string} owner
   * @param {string} collection
   */
  constructor (stream, owner, collection) {
    super()
    this.ystream = stream
    this.owner = owner
    this.ownerBin = buffer.fromBase64(owner)
    this.collection = collection
    /**
     * @type {Map<string, Set<Y.Doc>>}
     */
    this.docs = new Map()
    this.isSynced = false
    this.whenSynced = promise.create(resolve =>
      this.once('sync', resolve)
    )
    stream.emit('collection-opened', [this])
  }

  /**
   * @param {string} docname
   */
  getYdoc (docname) {
    const docset = map.setIfUndefined(this.docs, docname, () => new Set())
    const ydoc = new Y.Doc({
      guid: docname
    })
    docset.add(ydoc)
    ydoc.on('destroy', () => {
      docset.delete(ydoc)
    })
    bindydoc(this.ystream, this.owner, this.collection, docname, ydoc)
    return ydoc
  }

  /**
   * @param {string} docid
   * @return {Promise<string?>}
   */
  async getParent (docid) {
    const co = await actions.getDocOpsMerged(this.ystream, this.ownerBin, this.collection, docid, operations.OpChildOfType)
    return co?.op.parent || null
  }

  /**
   * @param {string} docid
   * @return {Promise<string?>}
   */
  async getDocName (docid) {
    const co = await actions.getDocOpsMerged(this.ystream, this.ownerBin, this.collection, docid, operations.OpChildOfType)
    return co?.op.childname || null
  }

  /**
   * @param {string} docid
   * @param {number} [endLocalClock]
   * @return {Promise<Array<{ docid: string, docname: string | null }>>}
   */
  getDocPath (docid, endLocalClock) {
    return actions.getDocPath(this.ystream, this.ownerBin, this.collection, docid, endLocalClock)
  }

  /**
   * @param {string} rootid
   * @param {Array<string>} path
   * @return {Promise<Array<string>>}
   */
  getDocIdsFromNamePath (rootid, path) {
    return actions.getDocIdsFromNamePath(this.ystream, this.ownerBin, this.collection, rootid, path)
  }

  /**
   * This functions updates the parent of a doc AND sets the name of the document. It simulates
   * the behavior of the unix command `mv` "move".
   *
   * It is possible to query the children of a parent. The children can be identified by the docid
   * (immutable) OR the docname (mutable, but not guaranteed to be unique across devices).
   *
   * This function does not overwrite content. The existing file should be deleted manually.
   *
   * @param {string} childid
   * @param {string|null} parentDoc
   * @param {string} childname
   */
  async setDocParent (childid, parentDoc, childname) {
    const co = await actions.getDocOpsMerged(this.ystream, this.ownerBin, this.collection, childid, operations.OpChildOfType)
    await actions.addOp(this.ystream, this.ownerBin, this.collection, childid, new operations.OpChildOf(co?.op.cnt || 0, parentDoc, childname))
  }

  /**
   * This function retrieves the children on a document. It simulates the behavior of the `ls` unix
   * command.
   *
   * @param {string} docname
   * @return {Promise<Array<{ docid: string, docname: string }>>}
   */
  getDocChildren (docname) {
    return actions.getDocChildren(this.ystream, this.ownerBin, this.collection, docname)
  }

  /**
   * This function retrieves the children on a document. It simulates the behavior of the `ls **\/*
   * -l` unix command.
   *
   * @param {string} docname
   */
  getDocChildrenRecursive (docname) {
    return actions.getDocChildrenRecursive(this.ystream, this.ownerBin, this.collection, docname)
  }

  /**
   * @param {string} key
   * @returns undefined if the value was not defined previously
   */
  async getLww (key) {
    const lww = await actions.getDocOpsMerged(this.ystream, this.ownerBin, this.collection, key, operations.OpLwwType)
    return lww === null ? undefined : lww.op.val
  }

  /**
   * @param {string} key
   * @param {any} val
   * @return the previous values
   */
  async setLww (key, val) {
    const lww = await actions.getDocOpsMerged(this.ystream, this.ownerBin, this.collection, key, operations.OpLwwType)
    await actions.addOp(this.ystream, this.ownerBin, this.collection, key, new operations.OpLww(lww?.op.cnt || 0, val))
    return lww === null ? undefined : lww.op.val
  }

  /**
   * @param {string} docid
   */
  deleteDoc (docid) {
    return actions.deleteDoc(this.ystream, this.ownerBin, this.collection, docid)
  }

  /**
   * @param {string} docid
   */
  isDocDeleted (docid) {
    return actions.isDocDeleted(this.ystream, this.ownerBin, this.collection, docid)
  }

  destroy () {
    this.ystream.collections.get(this.owner)?.delete(this.collection)
  }
}