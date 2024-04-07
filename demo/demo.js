import { initEditor, initNotesList, initSidebar, renderNotesList } from './ui.js'
import { ynotes } from './ydb/main.js'

const notesList = initNotesList()
initSidebar(notesList)
initEditor()
ynotes.observeDeep(() => renderNotesList(notesList))
