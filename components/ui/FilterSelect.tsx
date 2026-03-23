import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Option = { label: string; value: string };

type FilterSelectSingleProps = {
  multiple?: false;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
};

type FilterSelectMultiProps = {
  multiple: true;
  value: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
};

type FilterSelectProps = FilterSelectSingleProps | FilterSelectMultiProps;
type MultiFilterSelectProps = Omit<FilterSelectMultiProps, "multiple">;

export default function FilterSelect({
  multiple,
  value,
  onChange,
  options,
  placeholder = "All",
  className = "",
}: FilterSelectProps) {
  if (multiple) {
    return (
      <MultiFilterSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input-base appearance-none cursor-pointer pr-8 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")] bg-no-repeat bg-position-[right_10px_center] ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function MultiFilterSelect({
  value,
  onChange,
  options,
  placeholder = "All",
  className = "",
}: MultiFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, []);

  const toggleValue = (nextValue: string) => {
    if (!nextValue) return;
    const exists = value.includes(nextValue);
    const nextSelected = exists
      ? value.filter((item) => item !== nextValue)
      : [...value, nextValue];
    onChange(nextSelected);
  };

  const selectedCount = value.length;
  const triggerLabel =
    selectedCount > 0 ? `${placeholder} (${selectedCount})` : placeholder;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        className="input-base h-9 w-full px-3 py-0 flex items-center justify-between gap-2"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate text-sm text-slate-700">{triggerLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-max min-w-full max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="max-h-52 overflow-auto pr-1">
            {options.map((option) => {
              const checked = value.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(option.value)}
                    className="accent-[#2563EB]"
                  />
                  <span className="truncate text-sm text-slate-700">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-xs text-slate-500">
              {selectedCount} selected
            </span>
            <button
              type="button"
              className="text-xs text-[#2563EB] hover:text-[#1D4ED8]"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
