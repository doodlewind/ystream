export const style = `
body {
  display: flex;
  margin: 0;
  font-family: sans-serif;
  font-size: 14px;
}
body, html {
  min-height: 100vh;
}
.sidebar {
  width: 200px;
  margin-top: 1em;
  padding-left: .9em;
  overflow: auto;
}
.sidebar > * {
  margin: .3em 0;
}
#content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.sidebar button {
  margin-right: 2px;
}
#content > .docname {
  font-size: x-large;
  font-weight: bold;
  border: none;
  outline: none;
  margin-top: 0.5em;
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
