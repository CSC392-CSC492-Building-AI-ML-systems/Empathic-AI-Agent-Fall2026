import { useEffect, useRef } from 'react';
import { ChatBubble } from './ChatBubble';

export function ChatThread({ messages, isLoading }) {
	const messagesEndRef = useRef(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isLoading]);

	return (
		<div className="flex-1 overflow-y-auto p-12 space-y-6 max-w-4xl w-full mx-auto">
		{messages.map((msg) => (
			<ChatBubble key={msg.id} sender={msg.sender} text={msg.text} />
		))}

		{/* Visual loading indicator */}
		{isLoading && (
			<div className="text-sm text-gray-400 italic py-2">
			Thinking...
			</div>
		)}

		{/* Invisible element to anchor the scroll position */}
		<div ref={messagesEndRef} />
		</div>
	);
}