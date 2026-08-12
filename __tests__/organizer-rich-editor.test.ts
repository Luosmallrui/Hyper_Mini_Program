import fs from 'fs'
import path from 'path'

const sourcePath = path.join(__dirname, '..', 'src', 'pages', 'user-sub', 'organizer', 'index.tsx')
const source = fs.readFileSync(sourcePath, 'utf8')

describe('organizer activity rich text editor', () => {
  it('uses the native Taro Editor component instead of a plain textarea for activity summary', () => {
    expect(source).toMatch(/import\s+\{[^}]*Editor[^}]*\}\s+from '@tarojs\/components'/s)
    expect(source).toContain('<Editor')
    expect(source).toContain('id="activity-summary-editor"')
    expect(source).not.toContain('className="editor-textarea"')
  })

  it('binds editor context commands to toolbar actions', () => {
    expect(source).toContain('const editorContextRef = useRef')
    expect(source).toContain('handleEditorReady')
    expect(source).toContain('handleEditorToolTap')
    expect(source).toContain('editor.format(tool.key, tool.value || \'\')')
    expect(source).toContain("if (tool.key === 'undo') editor.undo()")
    expect(source).toContain("if (tool.key === 'redo') editor.redo()")
  })
})
