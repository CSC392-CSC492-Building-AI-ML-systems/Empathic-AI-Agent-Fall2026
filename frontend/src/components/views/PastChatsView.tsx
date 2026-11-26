// import { PAST_CHATS_MOCK } from '../../mockChats/pastChatsTemp';
{/* temporary to show what past chats can be like ^^ */}
import type { ReactNode } from 'react';
import type { ChatSession } from '../../types/chat';
import { TrashIcon } from '../buttons/Icons';

interface PastChatsViewProps {
	onSelectChat: (session: ChatSession) => void;
	sessions: ChatSession[];
	onDeleteChat: (sessionId: string) => void;
	isLoading?: boolean;
}

export function PastChatsView({
	onSelectChat, 
	sessions, 
	onDeleteChat, 
	isLoading = false
}: PastChatsViewProps) {

	let pastChatsList;
	if (isLoading) {
		pastChatsList = (
			<div className="space-y-4" role="status" aria-busy="true">
				<span className="sr-only">Loading your chats</span>
				{[1, 2, 3].map((n) => (
					<div
						key={n}
						className="w-full h-20 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-700/60 animate-pulse motion-reduce:animate-none"
					/>
				))}
			</div>
		);
	} 
	
	else if (!sessions || sessions.length === 0) {
		pastChatsList = <p className="text-base text-gray-600 dark:text-slate-400">No past chats found.</p>;
	}
	
	else {
		pastChatsList = sessions.map((session) => (
			<div
				key={session.session_id}
				role="button"
				tabIndex={0}
				onClick={() => onSelectChat(session)}
				onKeyDown={(e) => {
					if (e.target !== e.currentTarget) return; // ignore keys pressed on the delete button
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onSelectChat(session);
					}
				}}
				className="group w-full bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-gray-100 dark:border-slate-700/60 shadow-xs flex items-center justify-between gap-4 hover:border-purple-200 dark:hover:border-indigo-500/40 hover:shadow-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
			>
				<div className="space-y-1 min-w-0">
					<h3 className="font-semibold text-gray-900 dark:text-slate-100 text-base truncate">
						{session.session_name}
					</h3>
					<p className="text-sm text-gray-500 dark:text-slate-400">Open this chat</p>
				</div>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation(); // Prevent triggering the onSelectChat
						onDeleteChat(session.session_id);
					}}
					aria-label={`Delete chat: ${session.session_name}`}
					title="Delete chat"
					className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/50 transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
				>
					<TrashIcon />
				</button>
			</div>
		));
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="px-6 sm:px-12 py-10 max-w-3xl w-full mx-auto">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Past Chats</h1>
				<p className="text-base text-gray-600 dark:text-slate-400 mb-8">
					Pick up where you left off, or tidy up old chats.
				</p>

				<div className="space-y-4">
					{pastChatsList}
				</div>
			</div>
		</div>
	);
}