const base = { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', 'aria-hidden': true } as const;
const stroke = { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 } as const;

export const PlusIcon = () => (
	<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
	</svg>
);

export const HeartIcon = () => (
	<svg className="w-5 h-5 text-purple-600 dark:text-purple-400 fill-current" viewBox="0 0 24 24">
		<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
	</svg>
);

export const UserIcon = () => (
	<svg className="w-4 h-4 text-gray-700 dark:text-indigo-200" fill="currentColor" viewBox="0 0 24 24">
		<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
	</svg>
);

export const HistoryIcon = () => (
	<svg {...base}><path {...stroke} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export const LogoutIcon = () => (
	<svg {...base}><path {...stroke} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
);

export const LoginIcon = () => (
	<svg {...base} className="w-5 h-5 -scale-x-100"><path {...stroke} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
);

export const SettingsIcon = () => (
	<svg {...base}>
		<path {...stroke} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
		<path {...stroke} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
	</svg>
);

export const TrashIcon = () => (
	<svg {...base}><path {...stroke} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

export const SendIcon = () => (
	<svg {...base}><path {...stroke} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
);

export const MoreIcon = () => (
	<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
		<circle cx="5" cy="12" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="19" cy="12" r="1.75" />
	</svg>
);