// import { PAST_CHATS_MOCK } from '../../mockChats/pastChatsTemp';
{/* temporary to show what past chats can be like ^^ */}
import type { ReactNode } from 'react';
import type { ChatSession } from '../../types/chat';

interface PastChatsViewProps {
	onSelectChat: (session: ChatSession) => void;
	sessions: ChatSession[];
	onDeleteChat: (sessionId: string) => void;
	isLoading?: boolean;
}

export function PastChatsView({onSelectChat, sessions, onDeleteChat, isLoading = false}: PastChatsViewProps) {

	let pastChatsList;
	if (isLoading) {
		pastChatsList = (
			<div className="space-y-4">
				{[1, 2, 3].map((n) => (
					<div
						key={n}
						className="w-full h-20 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-700/60 animate-pulse"
					/>
				))}
			</div>
		);
	} 
	
	else if (!sessions || sessions.length === 0) {
		pastChatsList = <p className="text-gray-400 text-sm">No past chats found.</p>;
	}
	
	else {
		pastChatsList = sessions.map((session) => (
			<div
				key={session.session_id}
				onClick={() => onSelectChat(session)}
				className="w-full bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-gray-100 dark:border-slate-700/60 shadow-xs flex items-center justify-between hover:shadow-sm dark:hover:bg-slate-800 transition-all cursor-pointer"
			>
				<div className="space-y-1">
					<h3 className="font-bold text-gray-900 dark:text-slate-100 text-base">
						{session.session_name}
					</h3>
					<p className="text-xs text-gray-500 dark:text-slate-400">view this chat</p>
				</div>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation(); // Prevent triggering the onSelectChat
						onDeleteChat(session.session_id);
					}}
					className="ml-4 w-10 h-10 flex items-center justify-center rounded-xl text-base font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer shrink-0"
				>
					X
				</button>
			</div>
		));
	}

	return (
		<div className="p-12 overflow-y-auto max-w-4xl">
			<h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">Past Chats</h1>
			<p className="text-gray-500 dark:text-slate-400 mb-8 text-sm">Review past chats you have had</p>

			<div className="space-y-4">
				{pastChatsList}
			</div>
		</div>
	);
}