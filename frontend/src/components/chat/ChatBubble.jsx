import { HeartIcon, UserIcon } from '../buttons/Icons';

export function ChatBubble({ sender, text, timestamp, samPFP = null, onContextMenu }) {
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
						) : (
							<UserIcon />
				)}

				<span>{isBot ? 'SAM' : 'USER'}</span>
				</div>
				{formattedTime && (
					<span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">
						{formattedTime}
					</span>
				)}
			</div>

			<p className="text-sm text-gray-800 dark:text-slate-100 leading-relaxed">{text}</p>
		</div>
		</div>
	);
}