import { useState } from 'react';
import type { ChatSession } from '../../types/chat';
import { TrashIcon, SearchIcon } from '../buttons/Icons';
import { IconButton } from '../buttons/IconButton';
import { Button } from '../buttons/Button';
import { PRESS, FOCUS, CARD, PAGE, PAGE_INNER, HEADING, SUBTEXT } from '../buttons/styles';

interface PastChatsViewProps {
	onSelectChat: (session: ChatSession) => void;
	sessions: ChatSession[];
	onDeleteChat: (sessionId: string) => void;
	isLoading?: boolean;
}

// show the search box once there are enough chats for it to be useful
const SEARCH_THRESHOLD = 5;

export function PastChatsView({ onSelectChat, sessions, onDeleteChat, isLoading = false }: PastChatsViewProps) {
	const [query, setQuery] = useState('');
	// which chat is currently showing "Delete this chat?"
	const [confirmingId, setConfirmingId] = useState<string | null>(null);

	const cleanedQuery = query.trim().toLowerCase();
	const visibleSessions = (sessions ?? []).filter((s) =>
		(s.session_name ?? '').toLowerCase().includes(cleanedQuery)
	);

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
	} else if (!sessions || sessions.length === 0) {
		pastChatsList = (
			<div className={`${CARD} p-8 text-center space-y-2`}>
				<p className="text-lg font-semibold text-gray-900 dark:text-slate-100">No past chats yet</p>
				<p className={SUBTEXT}>Once you start talking with Sam, your conversations will show up here.</p>
			</div>
		);
	} else if (visibleSessions.length === 0) {
		pastChatsList = (
			<p className={SUBTEXT}>No chats match "{query.trim()}". Try a different word.</p>
		);
	} else {
		pastChatsList = visibleSessions.map((session) => {
			const isConfirming = confirmingId === session.session_id;

			return (
				<div
					key={session.session_id}
					role="button"
					tabIndex={0}
					onClick={() => {
						if (isConfirming) return;
						onSelectChat(session);
					}}
					onKeyDown={(e) => {
						if (e.target !== e.currentTarget || isConfirming) return; // ignore keys pressed on inner buttons
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onSelectChat(session);
						}
					}}
					className={`${CARD} w-full p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 hover:border-purple-200 dark:hover:border-indigo-500/40 hover:shadow-sm cursor-pointer ${PRESS} ${FOCUS} active:scale-[0.99]`}
				>
					<div className="space-y-1 min-w-0">
						<h3 className="font-semibold text-gray-900 dark:text-slate-100 text-base truncate">
							{session.session_name}
						</h3>
						<p className="text-sm text-gray-500 dark:text-slate-400">
							{isConfirming ? 'Delete this chat? This can\u2019t be undone.' : 'Open this chat'}
						</p>
					</div>

					{isConfirming ? (
						<div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
							<Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
								Cancel
							</Button>
							<Button
								variant="primary"
								size="sm"
								className="bg-red-600! border-red-600! hover:bg-red-700!"
								onClick={() => {
									onDeleteChat(session.session_id);
									setConfirmingId(null);
								}}
							>
								Delete
							</Button>
						</div>
					) : (
						<span onClick={(e) => e.stopPropagation()}>
							<IconButton
								label={`Delete chat: ${session.session_name}`}
								tone="danger"
								onClick={() => setConfirmingId(session.session_id)}
							>
								<TrashIcon />
							</IconButton>
						</span>
					)}
				</div>
			);
		});
	}

	return (
		<div className={PAGE}>
			<div className={PAGE_INNER}>
				<h1 className={`${HEADING} mb-2`}>Past Chats</h1>
				<p className={`${SUBTEXT} mb-6`}>Look at all the past chats we have had.</p>

				{!isLoading && sessions && sessions.length >= SEARCH_THRESHOLD && (
					<div className="relative mb-6">
						<span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
							<SearchIcon />
						</span>
						<input
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search your chats..."
							aria-label="Search your chats"
							className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-full py-3 pl-12 pr-4 text-base text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 shadow-xs transition focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
						/>
					</div>
				)}

				<div className="space-y-3 sm:space-y-4">{pastChatsList}</div>
			</div>
		</div>
	);
}