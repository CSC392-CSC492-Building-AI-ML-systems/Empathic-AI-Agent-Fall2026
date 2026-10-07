import { ArrowRightIcon } from '../buttons/Icons';

const PAST_CHATS_MOCK = [
	{ id: 1, date: 'Jan 1, 2026', title: 'laptop', desc: 'you wanted to buy a laptop and I suggested blah blah blah' },
	{ id: 2, date: 'Jan 10, 2026', title: 'climbing questions', desc: 'helped you with climbing' },
	{ id: 3, date: 'Jan 19, 2026', title: 'tft comp recs', desc: 'helped you learn comps to reach masters' },
	{ id: 4, date: 'Jan 29, 2026', title: 'life chat', desc: 'talked about life' },
];

export function PastChatsView() {
	return (
		<div className="p-12 overflow-y-auto max-w-4xl">
		<h1 className="text-3xl font-bold text-gray-900 mb-1">Past Chats</h1>
		<p className="text-gray-500 mb-8 text-sm">Review past chats you have had</p>

		<div className="space-y-4">
			{PAST_CHATS_MOCK.map((chat) => (
			<div
				key={chat.id}
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