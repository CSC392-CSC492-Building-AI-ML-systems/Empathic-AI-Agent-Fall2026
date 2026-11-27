import type { MouseEvent, ReactNode } from 'react';
import { PRESS, FOCUS } from './styles';

interface IconButtonProps {
	label: string; // read by screen readers and shown as a tooltip
	onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
	children: ReactNode;
	tone?: 'default' | 'danger' | 'active';
	size?: 'md' | 'sm';
	disabled?: boolean;
	className?: string;
}

const TONES = {
	default:
		'text-gray-500 hover:text-gray-800 hover:bg-black/5 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10',
	danger:
		'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/50',
	active: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
};

const SIZES = {
	md: 'w-10 h-10',
	sm: 'w-8 h-8',
};

export function IconButton({
	label,
	onClick,
	children,
	tone = 'default',
	size = 'md',
	disabled = false,
	className = '',
}: IconButtonProps) {
    
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			title={label}
			className={`${SIZES[size]} shrink-0 inline-flex items-center justify-center rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${TONES[tone]} ${PRESS} ${FOCUS} ${className}`}
		>
			{children}
		</button>
	);
}