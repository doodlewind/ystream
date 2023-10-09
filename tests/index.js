import { runTests } from 'lib0/testing.js'
import { isBrowser, isNode } from 'lib0/environment.js'
import * as log from 'lib0/logging'
import * as ydb from './ydb.tests.js'
import * as actions from './actions.tests.js'
import * as authentication from './authentication.tests.js'

/* c8 ignore next 3 */
if (isBrowser) {
  log.createVConsole(document.body)
}

runTests(/** @type {any} */ ({
  authentication,
  ydb,
  actions
})).then(success => {
  /* istanbul ignore next 3 */
  if (isNode) {
    process.exit(success ? 0 : 1)
  }
})
