/* eslint-env browser */
import * as Y from 'yjs'
import * as dom from 'lib0/dom'
import * as pair from 'lib0/pair'
import * as number from 'lib0/number'
import * as random from 'lib0/random'
import { style } from './style.js'
import { owner } from './ydb/auth.js'
import { collectionName, ystream, ynotes, yroot } from './ydb/main.js'
import { openDocumentInCodeMirror } from './editor.js'

// add some css
dom.appendChild(document.head || document.body, dom.element('style', [], [dom.text(style)]))

/**
 * @param {number} n
 */
const createNotes = n => {
  const notes = []
  const collection = ystream.getCollection(owner, collectionName)
  for (let i = 0; i < n; i++) {
    const ynote = new Y.Map()
    const ynoteContent = collection.getYdoc(`#${ynotes.length + i}`)
    ynoteContent.getText().insert(0, `# Note #${ynotes.length + i}\nsome initial content`)
    ynote.set('name', `Note #${ynotes.length + i}`)
    ynote.set('content', ynoteContent)
    notes.unshift(ynote)
  }
  ynotes.insert(0, notes)
}

const editorDiv = dom.element('div', [pair.create('class', 'editor')])
const editorDocnameInput = /** @type {HTMLInputElement} */ (dom.element('input', [pair.create('type', 'text'), pair.create('placeholder', 'Document name'), pair.create('class', 'docname')]))

export const initNotesList = () => {
  const notesList = dom.element('ul', [pair.create('class', 'notes-list')])
  notesList.addEventListener('click', event => {
    const target = /** @type {HTMLElement?} */ (event.target)
    const docid = target?.getAttribute('ydoc')
    const i = target?.getAttribute('i')
    if (docid && i) {
      openDocumentInCodeMirror(docid, ynotes.get(number.parseInt(i)), editorDiv, editorDocnameInput)
    }
  })
  return notesList
}

/** @param {Element} notesList */
export const initSidebar = (notesList) => {
  const newNoteElement = dom.element('button', [], [dom.text('+1 Note')])
  newNoteElement.addEventListener('click', () => createNotes(1))

  const new100NotesElement = dom.element('button', [], [dom.text('+100 Notes')])
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
    newNoteElement,
    new100NotesElement,
    dom.element('details', [pair.create('open', true)], [
      dom.element('summary', [], [dom.text('Notes')]),
      notesList
    ])
  ]))
}

/** @param {Element} notesList */
export const renderNotesList = (notesList) => {
  notesList.innerHTML = ynotes.toArray().map((ynote, i) => `<li i="${i}" ydoc="${ynote.get('content').guid}">${ynote.get('name') || '&lt;unnamed&gt;'}</li>`).join('')
}

export const initEditor = () => {
  dom.appendChild(document.body, dom.element('div', [pair.create('id', 'content')], [
    editorDocnameInput,
    editorDiv
  ]))
}

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

// @ts-ignore
window.demo = { editorState: null, yroot }
