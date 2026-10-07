export function Button({ children, onClick, active = false, className = '' }) {
	return (
		<button
		onClick={onClick}
		className={`w-full flex items-center justify-between px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
			active
			? 'bg-gray-200/80 border-gray-400 text-gray-900 font-semibold'
			: 'border-gray-400/60 text-gray-700 hover:bg-white'
		} ${className}`}
		>
		{children}
		</button>
	);
}