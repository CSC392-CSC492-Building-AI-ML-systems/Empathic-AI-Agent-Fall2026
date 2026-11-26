import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MouseEvent } from 'react';
import { HeartIcon, UserIcon, MoreIcon } from '../buttons/Icons';
import type { Sender } from '../../types/chat';

const MARKDOWN_COMPONENTS: Components = {
	p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
	h1: ({ children }) => <h3 className="text-lg font-semibold mt-3 mb-1">{children}</h3>,
	h2: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>,
	h3: ({ children }) => <h4 className="text-base font-semibold mt-2 mb-1">{children}</h4>,
	strong: ({ children }) => (
		<strong className="font-bold text-gray-900 dark:text-white">{children}</strong>
	),
	em: ({ children }) => <em className="italic">{children}</em>,
	ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
	ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
	blockquote: ({ children }) => (
		<blockquote className="border-l-4 border-purple-200 dark:border-indigo-700 pl-3 text-gray-600 dark:text-slate-300">
			{children}
		</blockquote>
	),
	hr: () => <hr className="my-3 border-gray-200 dark:border-slate-700" />,
	table: ({ children }) => (
		<div className="overflow-x-auto my-2">
			<table className="text-sm border-collapse">{children}</table>
		</div>
	),
	th: ({ children }) => (
		<th className="border border-gray-200 dark:border-slate-700 px-3 py-1.5 text-left font-semibold">
			{children}
		</th>
	),
	td: ({ children }) => (
		<td className="border border-gray-200 dark:border-slate-700 px-3 py-1.5">{children}</td>
	),
	pre: ({ children }) => (
		<pre className="my-2 p-3 rounded-xl bg-gray-100 dark:bg-slate-900 overflow-x-auto text-sm font-mono">
			{children}
		</pre>
	),
	code: ({ children, ...props }) => (
		<code
			className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-sm font-mono"
			{...props}
		>
			{children}
		</code>
	),
	a: ({ href, children }) => (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="text-purple-700 dark:text-indigo-300 underline underline-offset-2 hover:opacity-80"
		>
			{children}
		</a>
	),
};

interface ChatBubbleProps {
	sender: Sender;
	text: string;
	timestamp?: string;
	samPFP?: string | null;
	userPFP?: string | null;
	samName?: string;
	username?: string;
	onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;
	onMenuClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function ChatBubble({ 
	sender, 
	text, 
	timestamp, 
	samPFP = null, 
	userPFP = null, 
	samName = 'Sam', 
	username = 'User',
	onContextMenu,
	onMenuClick
	}: ChatBubbleProps) {

	const isBot = sender === 'sam';

	// adding in a place for time
	const formattedTime = timestamp
		? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		: '';

	return (
		<div className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
			<div
				onContextMenu={onContextMenu}
				className={`max-w-xl rounded-2xl px-5 py-4 shadow-xs space-y-2 ${
					isBot ? 'w-full' : 'w-fit min-width:10rem'
				} ${
					isBot
						? 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/70'
						: 'bg-[#e3eae1] dark:bg-indigo-950/70 border border-transparent dark:border-indigo-800/60'
				}`}
			>
				<div className="flex items-center justify-between gap-4">
					<div
						className={`flex items-center gap-2 text-sm font-semibold ${
							isBot ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-indigo-200'
						}`}
					>
						{isBot ? (
							samPFP ? (
								<img
									src={samPFP}
									alt={samName}
									className="w-5 h-5 rounded-full object-cover shrink-0"
								/>
							) : (
								<HeartIcon />
							)
						) : userPFP ? (
							<img
								src={userPFP}
								alt={username}
								className="w-5 h-5 rounded-full object-cover shrink-0"
							/>
						) : (
							<UserIcon />
						)}

						<span>{isBot ? samName : username}</span>
					</div>

					<div className="flex items-center gap-2">
						{formattedTime && (
							<span className="text-xs text-gray-500 dark:text-slate-400">{formattedTime}</span>
						)}
						{onMenuClick && (
							<button
								type="button"
								onClick={onMenuClick}
								aria-label="Message options"
								title="Message options"
								className="p-1 -mr-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-black/5 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
							>
								<MoreIcon />
							</button>
						)}
					</div>
				</div>

				{isBot ? (
					<div className="text-base text-gray-800 dark:text-slate-100 leading-relaxed space-y-2">
						<ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
							{text}
						</ReactMarkdown>
					</div>
				) : (
					<p className="text-base text-gray-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
						{text}
					</p>
				)}
			</div>
		</div>
	);
}