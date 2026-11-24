import { HeartIcon } from '../buttons/Icons';
import { SidebarNavItem } from './SidebarNavItem';

export function Sidebar({ activeTab, onNewChat, onOpenPastChats, onOpenLogin, onLogout, onOpenSettings, isLoggedIn }) {
	return (
		<aside className="w-64 bg-[#e9ebe6] dark:bg-slate-950/70 border-r border-gray-300/60 dark:border-slate-800 flex flex-col justify-between p-4 shrink-0 transition-colors">
		<div className="space-y-6">
			
			<div className="flex items-center gap-2 px-2 py-1">
			<HeartIcon />
			<span className="font-bold text-lg text-gray-900 dark:text-slate-100">chat</span>
			</div>

			{/* sidebar */}
			<div className="space-y-2">
			<SidebarNavItem
				label="new chat"
				active={activeTab === 'chat_new'}
				onClick={onNewChat}
			/>
			<SidebarNavItem
				label="past chats"
				active={activeTab === 'past_chats'}
				onClick={onOpenPastChats}
			/>
			</div>
		</div>

		{/* bottom of sidebar */}
		<div className="space-y-2">
			<SidebarNavItem 
				label="login"
				active={activeTab === 'login'}
				onClick={onOpenLogin} 
			/>
			<SidebarNavItem
				label="logout"
				active={false}
				onClick={onLogout}
				disabled={!isLoggedIn}
			/>
			<SidebarNavItem 
				label="settings"
				active={activeTab === 'settings'}
				onClick={onOpenSettings} 
			/>
		</div>
		</aside>
	);
}