/* eslint-env browser */
// eslint-disable-next-line no-unused-vars
import * as Y from 'yjs'
// @ts-ignore
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import { EditorView, basicSetup } from 'codemirror'
import { keymap } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { owner } from './ydb/auth'
import { ystream, collectionName } from './ydb/main'

/**
 * @type {{view: EditorView, ydoc: Y.Doc, unregisterHandlers: function():void} | null}
 */
let currentEditorState = null

/**
 * @param {string} ydocname
 * @param {Y.Map<any>} yprops
 * @param {Element} editorDiv
 * @param {HTMLInputElement} editorDocnameInput
 */
export const openDocumentInCodeMirror = (ydocname, yprops, editorDiv, editorDocnameInput) => {
  currentEditorState?.unregisterHandlers()
  currentEditorState?.view.destroy()
  currentEditorState?.ydoc.destroy()
  const collection = ystream.getCollection(owner, collectionName)
  const ydoc = collection.getYdoc(ydocname)
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
