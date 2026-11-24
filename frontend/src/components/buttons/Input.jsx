

export function Input({ value, onChange, onSubmit, placeholder, type="text", disabled=false, children }) {
  return (
    <form onSubmit={onSubmit} className="relative flex items-center w-full">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-white border dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-full py-3.5 pl-6 pr-12 text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:border-gray-400 dark:focus:border-slate-500 shadow-xs placeholder-gray-400 dark:placeholder-slate-400 transition-colors"
      />
      {/* for the optional hide/show */}
      {children && (
        <div className="absolute right-12 flex items-center">
          {children}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="absolute right-4 p-1 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
      >
        →
      </button>
    </form>
  );
}