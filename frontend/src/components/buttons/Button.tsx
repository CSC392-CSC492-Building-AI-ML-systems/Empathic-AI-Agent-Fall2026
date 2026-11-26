import type { ReactNode } from 'react';

interface ButtonProps {
	children: ReactNode;
	onClick?: () => void;
	active?: boolean;
	className?: string;
	disabled?: boolean;
	variant?: 'nav' | 'primary' | 'secondary';
}

const BASE = 
	'flex items-center rounded-full border font-medium transition-all cursor-pointer ' +
	'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:ring-offset-2 ' +
	'focus-visible:ring-offset-[#f6f7f5] dark:focus-visible:ring-offset-slate-900 ' +
	'disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTS = {
	nav: (active: boolean) =>
		`w-full justify-between gap-3 px-4 py-2.5 text-sm ${
			active
				? 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 font-semibold shadow-xs'
				: 'border-transparent text-gray-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-white'
		}`,
	primary:
		'justify-center px-6 py-3 text-base bg-gray-900 text-white border-gray-900 hover:opacity-90 dark:bg-indigo-500 dark:border-indigo-500',
	secondary:
		'justify-center px-6 py-3 text-base bg-white text-gray-800 border-gray-300 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700',
};

export function Button({ 
	children, 
	onClick, 
	active = false, 
	className = '', 
	disabled = false,
	variant = 'nav' 
	}: ButtonProps) {
	
	const style = variant === 'nav' ? VARIANTS.nav(active) : VARIANTS[variant];

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-current={variant === 'nav' && active ? 'page' : undefined}
			className={`${BASE} ${style} ${className}`}
		>
			{children}
		</button>
	);
}