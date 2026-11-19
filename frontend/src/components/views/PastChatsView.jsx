import { ArrowRightIcon } from '../buttons/Icons';
// import { PAST_CHATS_MOCK } from '../../mockChats/pastChatsTemp';
{/* temporary to show what past chats can be like ^^ */}

export function PastChatsView({onSelectChat, sessions}) {

	let pastChatsList;
	if (!sessions || sessions.length === 0) {
		pastChatsList = <p className="text-gray-400 text-sm">No past chats found.</p>;
	} else {
		pastChatsList = sessions.map((session) => (
			<div
				key={session.session_id}
				onClick={() => onSelectChat(session)}
				className="w-full bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer"
			>
				<div className="space-y-1">
					<h3 className="font-bold text-gray-900 text-base">
						{session.session_name}
					</h3>
					<p className="text-xs text-gray-500">view this chat</p>
				</div>
				<div className="p-2 rounded-full bg-gray-50 text-gray-600">
					<ArrowRightIcon />
				</div>
			</div>
		));
	}

	return (
		<div className="p-12 overflow-y-auto max-w-4xl">
			<h1 className="text-3xl font-bold text-gray-900 mb-1">Past Chats</h1>
			<p className="text-gray-500 mb-8 text-sm">Review past chats you have had</p>

			<div className="space-y-4">
				{pastChatsList}
			</div>
		</div>
	);
}