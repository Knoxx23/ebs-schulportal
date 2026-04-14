import React from 'react';

type Status = 'draft' | 'submitted' | 'returned' | 'approved' | 'archived' | 'pending' | 'activated' | 'completed' | 'expired';

interface StatusBadgeProps {
  status: Status | string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  draft: {
    label: 'In Bearbeitung',
    className: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    dot: 'bg-yellow-400',
  },
  submitted: {
    label: 'Eingereicht',
    className: 'bg-blue-50 text-blue-800 border border-blue-200',
    dot: 'bg-blue-400',
  },
  returned: {
    label: 'Zurückgegeben',
    className: 'bg-red-50 text-red-800 border border-red-200',
    dot: 'bg-red-400',
  },
  approved: {
    label: 'Genehmigt',
    className: 'bg-green-50 text-green-800 border border-green-200',
    dot: 'bg-green-400',
  },
  archived: {
    label: 'Archiviert',
    className: 'bg-gray-50 text-gray-700 border border-gray-200',
    dot: 'bg-gray-400',
  },
  pending: {
    label: 'Ausstehend',
    className: 'bg-gray-50 text-gray-700 border border-gray-200',
    dot: 'bg-gray-300',
  },
  activated: {
    label: 'Aktiviert',
    className: 'bg-blue-50 text-blue-800 border border-blue-200',
    dot: 'bg-blue-400',
  },
  completed: {
    label: 'Abgeschlossen',
    className: 'bg-green-50 text-green-800 border border-green-200',
    dot: 'bg-green-400',
  },
  expired: {
    label: 'Abgelaufen',
    className: 'bg-gray-50 text-gray-500 border border-gray-200',
    dot: 'bg-gray-300',
  },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-50 text-gray-600 border border-gray-200',
    dot: 'bg-gray-300',
  };

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.className} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
