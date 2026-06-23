import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  name: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SelectField({
  label,
  name,
  options,
  placeholder = "Selecione...",
  required,
  value,
  onChange,
  className,
  disabled,
}: SelectFieldProps) {
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={name} className="mercatto-label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        disabled={disabled}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="mercatto-input"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
