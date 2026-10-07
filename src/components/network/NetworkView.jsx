import React from 'react';
import { DataTable, Section } from '../ui';
import { formatSize, formatTime } from '../../utils/format';

export default function NetworkView({ resources = [] }) {
  const columns = [
    { key: 'name', header: 'Resource', mono: true },
    { key: 'type', header: 'Type', width: '80px' },
    {
      key: 'transferSize',
      header: 'Size',
      width: '90px',
      align: 'right',
      mono: true,
      render: (v) => formatSize(v),
    },
    {
      key: 'duration',
      header: 'Duration',
      width: '90px',
      align: 'right',
      mono: true,
      render: (v) => formatTime(v),
    },
  ];

  return (
    <Section title="Network Requests" description="Subresources loaded by the document">
      <DataTable columns={columns} data={resources} keyField="name" maxHeight="400px" />
    </Section>
  );
}
