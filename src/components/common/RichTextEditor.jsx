import React, { useRef, useEffect } from 'react';

const RichTextEditor = ({ value, onChange, placeholder = 'Write details here...' }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (onChange) {
        onChange(html === '<p><br></p>' || html === '<br>' ? '' : html);
      }
    }
  };

  const exec = (command, val = null) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleFormatBlock = (tag) => {
    if (tag === 'p') {
      exec('formatBlock', '<p>');
    } else {
      exec('formatBlock', `<${tag}>`);
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter URL (https://...):');
    if (url) {
      exec('createLink', url);
    }
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table class="table table-bordered my-2" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="border: 1px solid #dee2e6; padding: 8px; background: #f8f9fa;">Header 1</th>
            <th style="border: 1px solid #dee2e6; padding: 8px; background: #f8f9fa;">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 8px;">Content 1</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">Content 2</td>
          </tr>
        </tbody>
      </table>
    `;
    exec('insertHTML', tableHtml);
  };

  return (
    <div
      className="ck ck-reset ck-editor ck-rounded-corners border rounded"
      style={{ borderColor: '#d1d5db', background: '#ffffff', overflow: 'hidden' }}
    >
      {/* Toolbar */}
      <div
        className="d-flex align-items-center flex-wrap gap-1 p-2 border-bottom bg-light"
        style={{ borderBottomColor: '#e5e7eb' }}
      >
        {/* Undo / Redo */}
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('undo')}
          title="Undo (Ctrl+Z)"
        >
          <i className="ti ti-arrow-back-up fs-15 text-dark"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('redo')}
          title="Redo (Ctrl+Y)"
        >
          <i className="ti ti-arrow-forward-up fs-15 text-dark"></i>
        </button>

        <div className="vr mx-1 my-1"></div>

        {/* Heading Dropdown */}
        <select
          className="form-select form-select-sm"
          style={{ width: '130px', height: '31px', fontSize: '13px' }}
          onChange={(e) => handleFormatBlock(e.target.value)}
          defaultValue="p"
        >
          <option value="p">Paragraph</option>
          <option value="h3">Heading 1</option>
          <option value="h4">Heading 2</option>
          <option value="h5">Heading 3</option>
        </select>

        <div className="vr mx-1 my-1"></div>

        {/* Formatting Buttons */}
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('bold')}
          title="Bold (Ctrl+B)"
        >
          <i className="ti ti-bold fs-15 text-dark"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('italic')}
          title="Italic (Ctrl+I)"
        >
          <i className="ti ti-italic fs-15 text-dark"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('underline')}
          title="Underline (Ctrl+U)"
        >
          <i className="ti ti-underline fs-15 text-dark"></i>
        </button>

        <div className="vr mx-1 my-1"></div>

        {/* Link & Table & Blockquote */}
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={handleInsertLink}
          title="Insert Link"
        >
          <i className="ti ti-link fs-15 text-dark"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={handleInsertTable}
          title="Insert Table"
        >
          <i className="ti ti-table fs-15 text-dark"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('formatBlock', '<blockquote>')}
          title="Blockquote"
        >
          <i className="ti ti-quote fs-15 text-dark"></i>
        </button>

        <div className="vr mx-1 my-1"></div>

        {/* Lists */}
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('insertUnorderedList')}
          title="Bulleted List"
        >
          <i className="ti ti-list fs-15 text-dark"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('insertOrderedList')}
          title="Numbered List"
        >
          <i className="ti ti-list-numbers fs-15 text-dark"></i>
        </button>

        <div className="vr mx-1 my-1"></div>

        {/* Indentation */}
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('outdent')}
          title="Decrease Indent"
        >
          <i className="ti ti-indent-decrease fs-15 text-dark"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-light border bg-white px-2 py-1"
          onClick={() => exec('indent')}
          title="Increase Indent"
        >
          <i className="ti ti-indent-increase fs-15 text-dark"></i>
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-3 text-dark"
        style={{
          minHeight: '200px',
          outline: 'none',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#000000',
        }}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
