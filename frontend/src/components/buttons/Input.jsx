import { SearchIcon } from './Icons';

export function Input({ value, onChange, onSubmit, placeholder }) {
  return (
    <form onSubmit={onSubmit} className="relative flex items-center w-full">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-200 rounded-full py-3.5 pl-6 pr-12 text-sm text-gray-800 focus:outline-none focus:border-gray-400 shadow-xs placeholder-gray-400"
      />
      <button
        type="submit"
        className="absolute right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
      >
        <SearchIcon />
      </button>
    </form>
  );
}