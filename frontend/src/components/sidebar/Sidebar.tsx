import { useEffect } from 'react';
import { HeartIcon, PlusIcon, HistoryIcon, LoginIcon, LogoutIcon, SettingsIcon, CloseIcon } from '../buttons/Icons';
import { IconButton } from '../buttons/IconButton';
import { SidebarNavItem } from './SidebarNavItem';
import type { SidebarTab } from '../../types/chat';

interface SidebarProps {
	activeTab: SidebarTab;
	onNewChat: () => void;
	onOpenPastChats: () => void;
	onOpenLogin?: () => void; 
	onLogout: () => void;
	onOpenSettings: () => void;
	isLoggedIn: boolean;
	// small screens: the sidebar slides in as a drawer
	isOpen?: boolean;
	onClose?: () => void;
	// shown in the little profile row at the bottom
	username?: string;
	userPFP?: string | null;
}

export function Sidebar({
	activeTab,
	onNewChat,
	onOpenPastChats,
	onOpenLogin,
	onLogout,
	onOpenSettings,
	isLoggedIn,
	isOpen = false,
	onClose,
	username = 'User',
	userPFP = null,
}: SidebarProps) {

	// Esc closes the drawer on small screens
	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose?.();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [isOpen, onClose]);

	// run the action, then close the drawer (does nothing on desktop)
	const run = (fn?: () => void) => () => {
		fn?.();
		onClose?.();
	};

	const initial = (username || 'U').charAt(0).toUpperCase();

	return (
		<>
			{/* dark backdrop behind the drawer, small screens only */}
			<div
				onClick={onClose}
				aria-hidden="true"
				className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 md:hidden ${
					isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
				}`}
			/>

			<aside
				className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:visible
					bg-[#e9ebe6] dark:bg-slate-950 border-r border-gray-300/60 dark:border-slate-800 flex flex-col justify-between p-4 shrink-0
					transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none
					${isOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'}`}
			>
				<div className="space-y-8">
					{/* close sidebar */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 px-3 py-1">
							<HeartIcon />
							<span className="font-bold text-xl tracking-tight text-gray-900 dark:text-slate-100">chat</span>
						</div>
						<span className="md:hidden">
							<IconButton label="Close menu" size="sm" onClick={onClose}>
								<CloseIcon />
							</IconButton>
						</span>
					</div>

					<nav aria-label="Main" className="space-y-1.5">
						<SidebarNavItem
							label="New chat"
							icon={<PlusIcon />}
							active={activeTab === 'chat_new'}
							onClick={run(onNewChat)}
						/>
						<SidebarNavItem
							label="Past chats"
							icon={<HistoryIcon />}
							active={activeTab === 'pastChats'}
							onClick={run(onOpenPastChats)}
						/>
					</nav>
				</div>

				<div className="space-y-3">
					<nav aria-label="Account" className="space-y-1.5 pt-4 border-t border-gray-300/60 dark:border-slate-800">
						{/* we dont have a guest state yet so ignore logged in button */}
						{!isLoggedIn && (
							<SidebarNavItem
								label="Log in"
								icon={<LoginIcon />}
								active={activeTab === 'login'}
								onClick={run(onOpenLogin)}
							/>
						)}
						<SidebarNavItem
							label="Settings"
							icon={<SettingsIcon />}
							active={activeTab === 'settings'}
							onClick={run(onOpenSettings)}
						/>
						<SidebarNavItem
							label="Log out"
							icon={<LogoutIcon />}
							active={false}
							onClick={run(onLogout)}
							disabled={!isLoggedIn}
						/>
					</nav>

					{/* logged in */}
					{isLoggedIn && (
						<div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/50 dark:bg-slate-900/60">
							{userPFP ? (
								<img src={userPFP} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
							) : (
								<span className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold bg-purple-100 text-purple-700 dark:bg-indigo-900/60 dark:text-indigo-200">
									{initial}
								</span>
							)}
							<div className="min-w-0">
								<p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{username}</p>
								<p className="text-xs text-gray-500 dark:text-slate-400">Logged in</p>
							</div>
						</div>
					)}
				</div>
			</aside>
		</>
	);
}