export function AgentThinking({ name = 'Sam' }: { name?: string }) {
	return (
		<div className="px-1 py-2" role="status" aria-live="polite">
			<div className="flex items-center gap-1.5 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/70 rounded-2xl w-fit shadow-xs">
				<span className="sr-only">{name} is typing</span>
				<span className="w-2 h-2 bg-[#6e5f50] dark:bg-indigo-300 rounded-full animate-bounce motion-reduce:animate-none" />
				<span className="w-2 h-2 bg-[#6e5f50] dark:bg-indigo-300 rounded-full animate-bounce motion-reduce:animate-none [animation-delay:0.2s]" />
				<span className="w-2 h-2 bg-[#6e5f50] dark:bg-indigo-300 rounded-full animate-bounce motion-reduce:animate-none [animation-delay:0.4s]" />
			</div>
		</div>
	);
}