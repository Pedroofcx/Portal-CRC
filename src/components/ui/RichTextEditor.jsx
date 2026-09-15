import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

/**
 * Editor de texto rico (WYSIWYG) usando ReactQuill
 * - Negrito, itálico, sublinhado
 * - Listas, alinhamento
 * - Links
 * - Cores de texto
 */
export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Digite aqui...',
  height = '200px',
  className = '' 
}) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link'
  ];

  return (
    <div className={cn("bg-card rounded-lg border border-border", className)}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight: height }}
        className="quill-editor"
      />
      <style>{`
        .quill-editor .ql-container {
          font-family: inherit;
          font-size: 14px;
        }
        .quill-editor .ql-editor {
          min-height: ${height};
          max-height: 480px;
          overflow-y: auto;
          line-height: 1.6;
          padding: 12px 16px;
        }
        .quill-editor .ql-toolbar {
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px 8px 0 0;
          flex-wrap: wrap;
        }
        .quill-editor .ql-container {
          border-radius: 0 0 8px 8px;
        }
        .quill-editor .ql-editor h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
        .quill-editor .ql-editor h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 6px; }
        .quill-editor .ql-editor h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 4px; }
        .quill-editor .ql-editor ul, .quill-editor .ql-editor ol { padding-left: 1.5rem; }
        .quill-editor .ql-editor li { margin-bottom: 4px; }
        .quill-editor .ql-editor a { color: #2563eb; text-decoration: underline; }
      `}</style>
    </div>
  );
}