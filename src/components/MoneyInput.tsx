import type { ChangeEvent } from "react";

interface MoneyInputProps {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  helperText?: string;
}

export default function MoneyInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  helperText,
}: MoneyInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(e.target.value);
    onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
  };

  return (
    <div className="mb-3">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none pointer-events-none">
          ৳
        </span>
        <input
          id={name}
          name={name}
          type="number"
          min="0"
          value={value}
          onChange={handleChange}
          placeholder={placeholder ?? "0"}
          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
        />
      </div>
      {helperText && (
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">{helperText}</p>
      )}
    </div>
  );
}
