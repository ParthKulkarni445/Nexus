import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: SearchBarProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={15}
        className="absolute left-3 text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pl-9 pr-8"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
