export function Button({ children, onClick, active = false, className = '' }) {
	return (
		<button
		onClick={onClick}
		className={`w-full flex items-center justify-between px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
			active
			? 'bg-gray-200/80 dark:bg-slate-800 border-gray-400 dark:border-slate-600 text-gray-900 dark:text-slate-100 font-semibold'
			: 'border-gray-400/60 dark:border-slate-700/80 text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-white'
		} ${className}`}
		>
		{children}
		</button>
	);
}