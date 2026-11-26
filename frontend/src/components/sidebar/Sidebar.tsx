import { HeartIcon, PlusIcon, HistoryIcon, LoginIcon, LogoutIcon, SettingsIcon } from '../buttons/Icons';
import { SidebarNavItem } from './SidebarNavItem';
import type { SidebarTab } from '../../types/chat';

interface SidebarProps {
	activeTab: SidebarTab;
	onNewChat: () => void;
	onOpenPastChats: () => void;
	onOpenLogin?: () => void;   // optional: App currently doesn't pass it
	onLogout: () => void;
	onOpenSettings: () => void;
	isLoggedIn: boolean;
}

export function Sidebar({ 
	activeTab, 
	onNewChat, 
	onOpenPastChats, 
	onOpenLogin, 
	onLogout, 
	onOpenSettings, 
	isLoggedIn 
}: SidebarProps) {

	return (
		<aside className="w-64 bg-[#e9ebe6] dark:bg-slate-950/70 border-r border-gray-300/60 dark:border-slate-800 flex flex-col justify-between p-4 shrink-0 transition-colors">
			<div className="space-y-8">
				
				<div className="flex items-center gap-2 px-3 py-1">
					<HeartIcon />
					<span className="font-bold text-xl tracking-tight text-gray-900 dark:text-slate-100">chat</span>
				</div>

				{/* main navigation */}
				<nav aria-label="Main" className="space-y-1.5">
					<SidebarNavItem
						label="New chat"
						icon={<PlusIcon />}
						active={activeTab === 'chat_new'}
						onClick={onNewChat}
					/>
					<SidebarNavItem
						label="Past chats"
						icon={<HistoryIcon />}
						active={activeTab === 'pastChats'}
						onClick={onOpenPastChats}
					/>
				</nav>
			</div>

			{/* login/logout/settings */}
			<nav aria-label="Account" className="space-y-1.5 pt-4 border-t border-gray-300/60 dark:border-slate-800">
				{/* we dont need the login button yet cuz no guest state */}
				{!isLoggedIn && (
					<SidebarNavItem
						label="Log in"
						icon={<LoginIcon />}
						active={activeTab === 'login'}
						onClick={onOpenLogin}
					/>
				)}
				<SidebarNavItem
					label="Log out"
					icon={<LogoutIcon />}
					active={false}
					onClick={onLogout}
					disabled={!isLoggedIn}
				/>
				<SidebarNavItem
					label="Settings"
					icon={<SettingsIcon />}
					active={activeTab === 'settings'}
					onClick={onOpenSettings}
				/>
			</nav>
		</aside>
	);
}