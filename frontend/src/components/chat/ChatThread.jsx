import { useEffect, useRef, useState } from 'react';
import { ChatBubble } from './ChatBubble';
import { AgentThinking } from './AgentThinking';
import { MessageContextMenu } from './MessageContextMenu';

export function ChatThread({ messages, isTyping, onBranch, canBranch = false }) {
	const messagesEndRef = useRef(null);
	// { x, y, index } of the bubble that was right clicked
	const [menu, setMenu] = useState(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isTyping]);

	const openMenu = (e, index) => {
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY, index });
	};

	const buildMenuItems = (index) => {
		const msg = messages[index];

		return [
			{	
				// copy text to clipboard
				label: 'Copy',
				onSelect: () => navigator.clipboard?.writeText(msg.text),
			},
			{
				// branching off to create a new chat
				label: 'Branch off to new chat',
				onSelect: () => onBranch(index),
				disabled: !canBranch,
				hint: 'Wait for the reply first',
			},
		];
	};

	return (
		<div className="flex-1 overflow-y-auto p-12 space-y-6 max-w-4xl w-full mx-auto">
			{messages.map((msg, index) => (
				<ChatBubble 
					key={msg.id} 
					sender={msg.sender} 
					text={msg.text} 
					timestamp={msg.timestamp} 
					onContextMenu={onBranch ? (e) => openMenu(e, index) : undefined}
				/>
			))}

			{isTyping && <AgentThinking />}

			{/* menu closes itself if the chat was cleared underneath it */}
			{menu && messages[menu.index] && (
				<MessageContextMenu
					x={menu.x}
					y={menu.y}
					items={buildMenuItems(menu.index)}
					onClose={() => setMenu(null)}
				/>
			)}

			{/* anchor scroll position */}
			<div ref={messagesEndRef} />
		</div>
	);
}