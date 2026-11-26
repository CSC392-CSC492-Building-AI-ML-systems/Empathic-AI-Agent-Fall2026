import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import type { MenuItem } from '../../types/chat';

interface MessageMenuProps {
	x: number;
	y: number;
	items: MenuItem[];
	onClose: () => void;
}

// items = [{ label, onSelect, disabled?, hint? }]
export function MessageMenu({ x, y, items, onClose }: MessageMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ left: x, top: y });

	// measure before paint so the menu never flashes in the wrong place
	// nudge it back inside the window if the click was near an edge
	useLayoutEffect(() => {
		const menuEl = menuRef.current;
		if (!menuEl) return;
		const rect = menuEl.getBoundingClientRect();
		setPos({
			left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
			top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
		});
		// keyboard users land on the first usable item
		menuEl.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
	}, [x, y]);

	useEffect(() => {
		const onMouseDown = (e: MouseEvent) => {
			if (!menuRef.current?.contains(e.target as Node)) onClose();
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};

		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('keydown', onKeyDown);
		// capture = true so scrolling inside the chat thread also closes it
		window.addEventListener('scroll', onClose, true);
		window.addEventListener('resize', onClose);
		window.addEventListener('blur', onClose);

		return () => {
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('scroll', onClose, true);
			window.removeEventListener('resize', onClose);
			window.removeEventListener('blur', onClose);
		};
	}, [onClose]);

	// up/down arrows move between the usable items
	const handleArrowKeys = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
		e.preventDefault();
		const buttons = Array.from(
			menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []
		);
		if (buttons.length === 0) return;
		const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
		const next =
			e.key === 'ArrowDown'
				? (current + 1) % buttons.length
				: (current - 1 + buttons.length) % buttons.length;
		buttons[next].focus();
	};

	return createPortal(
		<div
			ref={menuRef}
			role="menu"
			onContextMenu={(e) => e.preventDefault()}
			onKeyDown={handleArrowKeys}
			style={{ position: 'fixed', left: pos.left, top: pos.top }}
			className="z-50 min-w-48 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 shadow-xl overflow-hidden"
		>
			{items.map((item) => (
				<button
					key={item.label}
					type="button"
					role="menuitem"
					disabled={item.disabled}
					title={item.disabled ? item.hint : undefined}
					onClick={() => {
						item.onSelect();
						onClose();
					}}
					className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/80 focus:bg-gray-100 dark:focus:bg-slate-700/80 focus:outline-none disabled:text-gray-400 dark:disabled:text-slate-500 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
				>
					{item.label}
					{item.disabled && item.hint && (
						<span className="block text-xs text-gray-400 dark:text-slate-500 mt-0.5">{item.hint}</span>
					)}
				</button>
			))}
		</div>,
		document.body
	);
}