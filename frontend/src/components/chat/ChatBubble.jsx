import { HeartIcon, UserIcon } from '../buttons/Icons';

export function ChatBubble({ sender, text }) {
	const isBot = sender === 'chat';

	return (
		<div className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
		<div
			className={`w-full max-w-xl rounded-2xl p-5 shadow-xs space-y-2 ${
			isBot ? 'bg-white border border-gray-100' : 'bg-[#e3eae1]'
			}`}
		>
			<div
			className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
				isBot ? 'text-purple-600' : 'text-gray-700'
			}`}
			>
			{isBot ? <HeartIcon /> : <UserIcon />}
			<span>{isBot ? 'CHAT' : 'USER'}</span>
			</div>
			<p className="text-sm text-gray-800 leading-relaxed">{text}</p>
		</div>
		</div>
	);
}