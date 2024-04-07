/* eslint-env browser */
import * as ydb from '@y/stream'
import * as wscomm from '@y/stream/comms/ws'
import * as Y from 'yjs'
import * as dom from 'lib0/dom'
import * as pair from 'lib0/pair'
import * as number from 'lib0/number'
// @ts-ignore
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import { EditorView, basicSetup } from 'codemirror'
import { keymap } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'

import * as random from 'lib0/random'
import { EditorState } from '@codemirror/state'
import { style } from './style.js'
import { initAuth, owner } from './auth.js'

const collection = 'my-notes-app'
const y = await ydb.openYdb('ydb-demo', [{ owner, collection }], {
  comms: [new wscomm.WebSocketComm('ws://localhost:9000')]
})

await initAuth(y)

const yroot = y.getYdoc(owner, collection, 'index')
const ynotes = yroot.getArray('notes')

// add some css
dom.appendChild(document.head || document.body, dom.element('style', [], [dom.text(style)]))

const notesList = dom.element('ul', [pair.create('class', 'notes-list')])
notesList.addEventListener('click', event => {
  const target = /** @type {HTMLElement?} */ (event.target)
  const docid = target?.getAttribute('ydoc')
  const i = target?.getAttribute('i')
  if (docid && i) {
    openDocumentInCodeMirror(docid, ynotes.get(number.parseInt(i)))
  }
})

/**
 * @param {number} n
 */
const createNotes = n => {
  const notes = []
  for (let i = 0; i < n; i++) {
    const ynote = new Y.Map()
    const ynoteContent = y.getYdoc(owner, collection, `#${ynotes.length + i}`)
    ynoteContent.getText().insert(0, `# Note #${ynotes.length + i}\nsome initial content`)
    ynote.set('name', `Note #${ynotes.length + i}`)
    ynote.set('content', ynoteContent)
    notes.unshift(ynote)
  }
  ynotes.insert(0, notes)
}

const newNoteElement = dom.element('button', [], [dom.text('Create Note')])

newNoteElement.addEventListener('click', () => createNotes(1))

const new100NotesElement = dom.element('button', [], [dom.text('Create 100 Notes')])
new100NotesElement.addEventListener('click', () => createNotes(100))

// sidebar
dom.appendChild(document.body, dom.element('div', [pair.create('class', 'sidebar')], [
  // user info
  dom.element('details', [], [
    dom.element('summary', [], [dom.text('User Details')]),
    dom.element('label', [], [
      dom.text('hash'),
      dom.element('input', [pair.create('type', 'text'), pair.create('value', 'abcde'), pair.create('disabled', true)])
    ])
  ]),
  dom.element('details', [pair.create('open', true)], [
    dom.element('summary', [], [dom.text('Notes')]),
    newNoteElement,
    new100NotesElement,
    notesList
  ])
]))

const renderNotes = () => {
  notesList.innerHTML = ynotes.toArray().map((ynote, i) => `<li i="${i}" ydoc="${ynote.get('content').guid}">${ynote.get('name') || '&lt;unnamed&gt;'}</li>`).join('')
}

const editorDiv = dom.element('div', [pair.create('class', 'editor')])
const editorDocnameInput = /** @type {HTMLInputElement} */ (dom.element('input', [pair.create('type', 'text'), pair.create('placeholder', 'Document name'), pair.create('class', 'docname')]))
dom.appendChild(document.body, dom.element('div', [pair.create('id', 'content')], [
  editorDocnameInput,
  editorDiv
]))

ynotes.observeDeep(renderNotes)

export const usercolors = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' }
]

export const userColor = usercolors[random.uint32() % usercolors.length]

// provider.awareness.setLocalStateField('user', {
//   name: 'Anonymous ' + Math.floor(Math.random() * 100),
//   color: userColor.color,
//   colorLight: userColor.light
// })

/**
 * @type {{view: EditorView, ydoc: Y.Doc, unregisterHandlers: function():void} | null}
 */
let currentEditorState = null

/**
 * @param {string} ydocname
 * @param {Y.Map<any>} yprops
 */
const openDocumentInCodeMirror = (ydocname, yprops) => {
  currentEditorState?.unregisterHandlers()
  currentEditorState?.view.destroy()
  currentEditorState?.ydoc.destroy()
  const ydoc = y.getYdoc(owner, collection, ydocname)
  const ytext = ydoc.getText()
  const state = EditorState.create({
    doc: ytext.toString(),
    extensions: [
      keymap.of([
        ...yUndoManagerKeymap
      ]),
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      yCollab(ytext/* , provider.awareness */)
      // oneDark
    ]
  })
  const view = new EditorView({ state, parent: editorDiv })
  const inputEventHandler = () => {
    const newName = editorDocnameInput.value
    if (yprops.get('name') !== newName && newName !== '<unnamed>') {
      yprops.set('name', newName)
    }
  }
  editorDocnameInput.addEventListener('input', inputEventHandler)
  const updateName = () => {
    editorDocnameInput.value = yprops.get('name')
  }
  yprops.observe(updateName)
  updateName()
  const unregisterHandlers = () => {
    yprops.unobserve(updateName)
    editorDocnameInput.removeEventListener('input', inputEventHandler)
  }
  currentEditorState = { view, ydoc, unregisterHandlers }
  // @ts-ignore
  window.demo.editorState = currentEditorState
}

// @ts-ignore
window.demo = { editorState: null, yroot }
