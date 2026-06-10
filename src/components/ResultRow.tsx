interface ResultRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  danger?: boolean;
  muted?: boolean;
}

export default function ResultRow({
  label,
  value,
  highlight,
  danger,
  muted,
}: ResultRowProps) {
  if (highlight) {
    return (
      <div className="flex justify-between items-center py-2 px-3 bg-blue-50 border-l-4 border-blue-500">
        <span className="text-sm font-semibold text-blue-900">{label}</span>
        <span className="text-base font-bold font-mono text-blue-900">{value}</span>
      </div>
    );
  }

  if (danger) {
    return (
      <div className="flex justify-between items-center py-1.5 px-3 bg-amber-50">
        <span className="text-sm text-amber-800">{label}</span>
        <span className="text-sm font-mono font-semibold text-amber-900">{value}</span>
      </div>
    );
  }

  if (muted) {
    return (
      <div className="flex justify-between items-center py-1.5 px-3">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-mono text-gray-400">{value}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center py-1.5 px-3 hover:bg-gray-50">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-mono text-gray-900">{value}</span>
    </div>
  );
}
