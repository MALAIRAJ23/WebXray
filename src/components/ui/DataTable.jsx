import React from 'react';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No data available',
  className = '',
  maxHeight,
  onRowClick,
}) {
  return (
    <div
      className={`border border-wl-border rounded-[6px] overflow-hidden bg-wl-surface ${className}`}
    >
      <div
        className="overflow-x-auto"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <table className="w-full text-left border-collapse select-text">
          <thead className="sticky top-0 bg-wl-raised text-[11px] font-sans font-medium text-wl-muted border-b border-wl-border z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`py-2 px-3 text-left font-sans font-medium whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-wl-border text-[12px]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-6 px-3 text-center text-wl-muted font-sans text-[12px]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const rowKey = (keyField && row[keyField]) || index;
                return (
                  <tr
                    key={rowKey}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`transition-colors duration-120 hover:bg-wl-raised/50 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((col) => {
                      const value = row[col.key];
                      const fontClass = col.mono ? 'font-mono' : 'font-sans';
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-3 text-wl-text ${alignClass} ${fontClass}`}
                        >
                          {col.render ? col.render(value, row, index) : (value ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
