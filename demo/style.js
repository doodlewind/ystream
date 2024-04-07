export const style = `
body {
  display: flex;
  margin: 0;
}
body, html {
  height: 100%;
}
.sidebar {
  width: 300px;
  padding: .4em;
  margin-top: 1em;
  padding-left: .9em;
}
.sidebar > * {
  margin: .3em 0;
}
#content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
#content > .docname {
  font-size: x-large;
  font-weight: bold;
  border: none;
  outline: none;
  margin-top: 1em;
}
.editor {
  flex-grow: 1;
}
.cm-editor {
  height: 100%;
}
.notes-list {
  padding: 0;
  margin: 0;
  overflow-y: scroll;
  max-height: 400px;
}
.notes-list > li {
  display: block;
  padding: 5px;
  cursor: pointer;
}
.notes-list > li:hover {
  text-decoration: underline;
}
`
