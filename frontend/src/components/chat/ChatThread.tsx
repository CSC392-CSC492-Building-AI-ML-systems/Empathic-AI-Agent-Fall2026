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

const MENU_WIDTH = 192;

export function ChatThread({
	messages,
	isTyping,
	onBranch,
	canBranch = false,
	samPFP = null,
	userPFP = null,
	samName = 'Sam',
	username = 'You',
}: ChatThreadProps) {

	const containerRef = useRef<HTMLDivElement>(null);
	const [menu, setMenu] = useState<MenuState | null>(null);

	const [toast, setToast] = useState<string | null>(null);
	const toastTimer = useRef<number | undefined>(undefined);

	// show the msg
	const showToast = (text: string) => {
		setToast(text);
		window.clearTimeout(toastTimer.current);
		toastTimer.current = window.setTimeout(() => setToast(null), 1800);
	};

	useEffect(() => () => window.clearTimeout(toastTimer.current), []);

	// autoscroll to bottom of chat
	const scrollToBottom = () => {
		const el = containerRef.current;
		if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, isTyping]);

	// right click to show menu or the ... on phones
	const openMenu = (e: MouseEvent<HTMLElement>, index: number) => {
		e.preventDefault();
		if (e.type === 'contextmenu') {
			setMenu({ x: e.clientX, y: e.clientY, index });
		} else {
			const rect = e.currentTarget.getBoundingClientRect();
			setMenu({ x: rect.right - MENU_WIDTH, y: rect.bottom + 4, index });
		}
	};

	const buildMenuItems = (index: number): MenuItem[] => {
		const msg = messages[index];

		return [
			{
				// copy text to clipboard
				label: 'Copy message',
				onSelect: () => {
					if (!navigator.clipboard) {
						showToast("Copying isn't available here");
						return;
					}
					navigator.clipboard
						.writeText(msg.text)
						.then(() => showToast('Copied to clipboard'))
						.catch(() => showToast("Couldn't copy that"));
				},
			},
			{
				// branching off to create a new chat
				label: 'Start a new chat from here',
				onSelect: () => onBranch?.(index),
				disabled: !canBranch,
				hint: 'Wait for the reply to finish first',
			},
		];
	};

	return (
		<div
			ref={containerRef}
			role="log"
			aria-live="polite"
			className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 max-w-4xl w-full mx-auto"
		>
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
					onMenuClick={onBranch ? (e) => openMenu(e, index) : undefined}
				/>
			))}

			{isTyping && <AgentThinking name={samName} />}

			{/* menu closes itself if the chat was cleared underneath it */}
			{menu && messages[menu.index] && (
				<MessageMenu
					x={menu.x}
					y={menu.y}
					items={buildMenuItems(menu.index)}
					onClose={() => setMenu(null)}
				/>
			)}

			{toast && (
				<div
					role="status"
					className="animate-toast-in fixed bottom-28 left-1/2 z-50 px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm font-medium shadow-lg"
				>
					{toast}
				</div>
			)}
		</div>
	);
}