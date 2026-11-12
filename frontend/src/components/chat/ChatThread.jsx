import { useEffect, useRef } from 'react';
import { ChatBubble } from './ChatBubble';
import { AgentThinking } from './AgentThinking';

export function ChatThread({ messages, isTyping }) {
	const messagesEndRef = useRef(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isTyping]);

	return (
		<div className="flex-1 overflow-y-auto p-12 space-y-6 max-w-4xl w-full mx-auto">
			{messages.map((msg) => (
				<ChatBubble key={msg.id} sender={msg.sender} text={msg.text} timestamp={msg.timestamp} />
			))}

			{isTyping && <AgentThinking />}

			{/* anchor scroll position */}
			<div ref={messagesEndRef} />
		</div>
	);
}