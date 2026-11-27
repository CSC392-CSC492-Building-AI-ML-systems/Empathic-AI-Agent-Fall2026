import type { ReactNode } from 'react';
import { PRESS, FOCUS } from './styles';

interface ButtonProps {
	children: ReactNode;
	onClick?: () => void;
	active?: boolean;
	className?: string;
	disabled?: boolean;
	variant?: 'nav' | 'primary' | 'secondary' | 'ghost';
	size?: 'md' | 'sm';
	type?: 'button' | 'submit';
}

// default styling
const BASE =
	'rounded-full border font-medium cursor-pointer select-none ' +
	'focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f7f5] dark:focus-visible:ring-offset-slate-900 ' +
	'disabled:opacity-50 disabled:cursor-not-allowed';

// whether button active or idle
const NAV_ACTIVE =
	'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 font-semibold shadow-xs';
const NAV_IDLE =
	'border-transparent text-gray-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-white';

const SIZES = {
	md: 'px-6 py-3 text-base',
	sm: 'px-4 py-2 text-sm',
};

const VARIANTS = {
	primary:
		'inline-flex items-center justify-center gap-2 bg-gray-900 text-white border-gray-900 hover:bg-gray-800 shadow-sm dark:bg-indigo-500 dark:border-indigo-500 dark:hover:bg-indigo-400',
	secondary:
		'inline-flex items-center justify-center gap-2 bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700',
	ghost:
		'inline-flex items-center justify-center gap-2 border-transparent text-gray-700 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10',
};

export function Button({
	children,
	onClick,
	active = false,
	className = '',
	disabled = false,
	variant = 'nav',
	size = 'md',
	type = 'button',
}: ButtonProps) {

	const style =
		variant === 'nav'
			? `flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm ${active ? NAV_ACTIVE : NAV_IDLE}`
			: `${VARIANTS[variant]} ${SIZES[size]}`;

	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			aria-current={variant === 'nav' && active ? 'page' : undefined}
			className={`${BASE} ${style} ${PRESS} ${FOCUS} ${className}`}
		>
			{children}
		</button>
	);
}