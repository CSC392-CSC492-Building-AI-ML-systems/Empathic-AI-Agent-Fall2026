import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ChatBubble } from './ChatBubble';
import { AgentThinking } from './AgentThinking';
import { MessageMenu } from './MessageMenu';
import type { ChatMessage, MenuItem } from '../../types/chat';

interface ChatThreadProps {
	messages: ChatMessage[];
	isTyping: boolean;
	onBranch?: (index: number) => void;
	canBranch?: boolean;
	samPFP?: string | null;
	userPFP?: string | null;
	samName?: string;
	username?: string;
}

interface MenuState { x: number; y: number; index: number }

export function ChatThread({ 
	messages, 
	isTyping, 
	onBranch, 
	canBranch = false, 
	samPFP = null, 
	userPFP = null, 
	samName = 'Sam',
	username = 'User' 
	}: ChatThreadProps) {

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [menu, setMenu] = useState<MenuState | null>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isTyping]);

	const openMenu = (e: MouseEvent<HTMLDivElement>, index: number) => {
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY, index });
	};

	const buildMenuItems = (index: number): MenuItem[] => {
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
					samPFP={samPFP}
					userPFP={userPFP}
					samName={samName}
					username={username}
					onContextMenu={onBranch ? (e) => openMenu(e, index) : undefined}
				/>
			))}

			{isTyping && <AgentThinking />}

			{/* menu closes itself if the chat was cleared underneath it */}
			{menu && messages[menu.index] && (
				<MessageMenu
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