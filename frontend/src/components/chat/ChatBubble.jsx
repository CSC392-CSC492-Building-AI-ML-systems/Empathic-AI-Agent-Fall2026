import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HeartIcon, UserIcon } from '../buttons/Icons';

const MARKDOWN_COMPONENTS = {
	p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
	strong: ({ children }) => (
		<strong className="font-bold text-gray-900 dark:text-white">{children}</strong>
	),
	em: ({ children }) => <em className="italic">{children}</em>,
	ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
	ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
	pre: ({ children }) => (
		<pre className="my-2 p-3 rounded-xl bg-gray-100 dark:bg-slate-900 overflow-x-auto text-xs font-mono">
			{children}
		</pre>
	),
	code: ({ children, ...props }) => (
		<code
			className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-xs font-mono"
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
			className="text-purple-600 dark:text-indigo-400 underline"
		>
			{children}
		</a>
	),
};

export function ChatBubble({ 
	sender, 
	text, 
	timestamp, 
	samPFP = null, 
	userPFP = null, 
	samName = 'Sam', 
	username = 'User',
	onContextMenu 
	}) {
	const isBot = sender === 'sam';

	// adding in a place for time
	const formattedTime = timestamp 
		? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
		: '';

	return (
		<div className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
			<div
				onContextMenu={onContextMenu}
				className={`w-full max-w-xl rounded-2xl p-5 shadow-xs space-y-2 ${
				isBot 
				? 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/70'
				: 'bg-[#e3eae1] dark:bg-indigo-950/70 border border-transparent dark:border-indigo-800/60'
				}`}
			>	
				<div className="flex items-center justify-between">
					<div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
						isBot ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-indigo-800/60'
					}`}
					>
					{isBot ? (
								samPFP ? (
									<img
										src={samPFP}
										alt="Sam"
										className="w-5 h-5 rounded-full object-cover shrink-0"
									/>
								) : (
									<HeartIcon />
								)
							) : userPFP ? (
									<img
										src={userPFP}
										alt="User"
										className="w-5 h-5 rounded-full object-cover shrink-0"
									/>
							) : (
								<UserIcon />
					)}

					<span>{isBot ? samName : username}</span>
					</div>
					{formattedTime && (
						<span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">
							{formattedTime}
						</span>
					)}
				</div>
				{isBot ? (
					<div className="text-sm text-gray-800 dark:text-slate-100 leading-relaxed space-y-2">
						<ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
							{text}
						</ReactMarkdown>
					</div>
				) : (
					<p className="text-sm text-gray-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
						{text}
					</p>
				)}
				
			</div>
		</div>
	);
}