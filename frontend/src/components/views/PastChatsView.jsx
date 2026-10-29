import { ArrowRightIcon } from '../buttons/Icons';
import { PAST_CHATS_MOCK } from '../../mockChats/pastChatsTemp';
{/* temporary to show what past chats can be like ^^ */}

export function PastChatsView({onSelectChat}) {
	return (
		<div className="p-12 overflow-y-auto max-w-4xl">
		<h1 className="text-3xl font-bold text-gray-900 mb-1">Past Chats</h1>
		<p className="text-gray-500 mb-8 text-sm">Review past chats you have had</p>

		<div className="space-y-4">
			{PAST_CHATS_MOCK.map((chat) => (
			<div
				key={chat.id}
				onClick={() => onSelectChat(chat)}
				className="w-full bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer"
			>
				<div className="space-y-1">
				<span className="text-xs text-gray-400 block">{chat.date}</span>
				<h3 className="font-bold text-gray-900 text-base">{chat.title}</h3>
				<p className="text-xs text-gray-500">{chat.desc}</p>
				</div>
				<div className="p-2 rounded-full bg-gray-50 text-gray-600">
				<ArrowRightIcon />
				</div>
			</div>
			))}
		</div>
		</div>
	);
}