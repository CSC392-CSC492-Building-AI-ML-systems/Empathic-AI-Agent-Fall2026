import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// items = [{ label, onSelect, disabled?, hint? }]
export function MessageMenu({ x, y, items, onClose }) {
	const menuRef = useRef(null);
	const [pos, setPos] = useState({ left: x, top: y });

	// measure before paint so the menu never flashes in the wrong place
	// nudge it back inside the window if the click was near an edge
	useLayoutEffect(() => {
		const rect = menuRef.current.getBoundingClientRect();
		setPos({
			left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
			top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
		});
		// keyboard users land on the first usable item
		menuRef.current.querySelector('button:not(:disabled)')?.focus();
	}, [x, y]);

	useEffect(() => {
		const onMouseDown = (e) => {
			if (!menuRef.current?.contains(e.target)) onClose();
		};
		const onKeyDown = (e) => {
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

	return createPortal(
		<div
			ref={menuRef}
			role="menu"
			onContextMenu={(e) => e.preventDefault()}
			style={{ position: 'fixed', left: pos.left, top: pos.top }}
			className="z-50 min-w-48 rounded-xl border border-gray-200 dark:border-slate-400 bg-white dark:bg-slate-800 py-1 shadow-lg"
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
					className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/80 focus:bg-gray-100 dark:focus:bg-slate-700/80 focus:outline-none disabled:text-gray-300 dark:disabled:text-slate-600 disabled:hover:bg-transparent disabled:cursor-not-allowed"
				>
					{item.label}
				</button>
			))}
		</div>,
		document.body
	);
}