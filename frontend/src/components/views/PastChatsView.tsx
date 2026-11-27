import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatSession } from '../../types/chat';
import { TrashIcon, SearchIcon } from '../buttons/Icons';
import { IconButton } from '../buttons/IconButton';
import { Button } from '../buttons/Button';
import { PRESS, FOCUS } from '../buttons/styles';

interface PastChatsViewProps {
	onSelectChat: (session: ChatSession) => void;
	sessions: ChatSession[];
	onDeleteChat: (sessionId: string) => void;
	isLoading?: boolean;
}

const SEARCH_THRESHOLD = 5;

const AIRMAIL_STRIPE =
	'repeating-linear-gradient(90deg, #7c3528 0px, #7c3528 10px, #f7f1e3 10px, #f7f1e3 16px, #465a45 16px, #465a45 26px, #f7f1e3 26px, #f7f1e3 32px)';

function parseSessionDate(session: ChatSession): Date | null {
	const raw =
		(session as { updated_at?: string; created_at?: string; timestamp?: string }).updated_at ??
		(session as { created_at?: string; timestamp?: string }).created_at ??
		(session as { timestamp?: string }).timestamp;
	if (!raw) return null;
	const parsed = new Date(raw);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(date: Date | null, index: number): string {
	if (!date) {
		const fallback = ['Nov 26', 'Nov 23', 'Nov 22', 'Nov 17', 'Nov 12'];
		return fallback[index % fallback.length];
	}
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(date: Date | null, index: number): string {
	if (!date) {
		const fallback = [
			'November 26, 2026',
			'November 23, 2026',
			'November 22, 2026',
			'November 17, 2026',
		];
		return fallback[index % fallback.length];
	}
	return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatMonthGroup(date: Date | null): string | null {
	if (!date) return null;
	return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function PastChatsView({ onSelectChat, sessions, onDeleteChat, isLoading = false }: PastChatsViewProps) {
	const [query, setQuery] = useState('');
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [flightKey, setFlightKey] = useState(0);
	const [hasLanded, setHasLanded] = useState(false);
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const leaveTimerRef = useRef<number | null>(null);
	const rafRef = useRef<number | null>(null);

	const cleanedQuery = query.trim().toLowerCase();
	const visibleSessions = useMemo(
		() =>
			(sessions ?? []).filter((s) =>
				(s.session_name ?? '').toLowerCase().includes(cleanedQuery)
			),
		[sessions, cleanedQuery]
	);

	useEffect(() => {
		return () => {
			if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current);
			if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
		};
	}, []);

	const activeIndex = visibleSessions.findIndex((s) => s.session_id === hoveredId);
	const activeSession = activeIndex >= 0 ? visibleSessions[activeIndex] : null;

	const previewSnippet = useMemo(() => {
		if (!activeSession) return '';
		const rawSnippet =
			(activeSession as { preview?: string; last_message?: string; summary?: string }).preview ??
			(activeSession as { last_message?: string; summary?: string }).last_message ??
			(activeSession as { summary?: string }).summary;
		if (rawSnippet && rawSnippet.trim().length > 0) return rawSnippet.trim();
		return `What did you notice when you reflected on "${activeSession.session_name || 'this conversation'}"?`;
	}, [activeSession]);

	const launchLetterFromCabinet = (sessionId: string) => {
		if (leaveTimerRef.current !== null) {
			window.clearTimeout(leaveTimerRef.current);
			leaveTimerRef.current = null;
		}
		if (rafRef.current !== null) {
			window.cancelAnimationFrame(rafRef.current);
		}

		setHoveredId(sessionId);
		setHasLanded(false);
		setFlightKey((k) => k + 1);

		// Start half-transparent overlapping the cabinet on frame 1, then fly to the right card on frame 2
		rafRef.current = window.requestAnimationFrame(() => {
			rafRef.current = window.requestAnimationFrame(() => {
				setHasLanded(true);
			});
		});
	};

	const scheduleRetractToCabinet = () => {
		if (confirmingId) return;
		if (leaveTimerRef.current !== null) {
			window.clearTimeout(leaveTimerRef.current);
		}
		leaveTimerRef.current = window.setTimeout(() => {
			setHasLanded(false);
			setHoveredId(null);
		}, 160);
	};

	let lastMonthLabel: string | null = 'November 2026';

	return (
		<div className="min-h-full w-full bg-[#f7f3ea] text-[#2b2118] px-6 py-7 lg:px-10">
			<div className="mx-auto max-w-6xl">
				{/* Top Bar: Helper Prompt + Search */}
				<div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-[#6b5c4d]">
						Hover over a filed letter to preview it. Click to read.
					</p>

					{!isLoading && sessions && sessions.length >= SEARCH_THRESHOLD && (
						<div className="relative w-full sm:w-64">
							<span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a7968]">
								<SearchIcon />
							</span>
							<input
								type="search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Find a conversation"
								aria-label="Find a conversation"
								className="w-full rounded-md border border-[#d8ccb8] bg-[#fbf8f2] py-2 pl-10 pr-3.5 text-sm text-[#2b2118] placeholder-[#8c7d6d] shadow-2xs transition focus:border-[#4b5d47] focus:outline-none focus:ring-2 focus:ring-[#4b5d47]/20"
							/>
						</div>
					)}
				</div>

				{/* Main Stage */}
				{isLoading ? (
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-12" role="status" aria-busy="true">
						<span className="sr-only">Loading your chats</span>
						<div className="h-105 rounded-xl border-2 border-[#4d311d] bg-[#664126]/80 animate-pulse lg:col-span-5" />
						<div className="h-85 rounded-md border border-[#dfd4c0] bg-[#fcf9f2] animate-pulse lg:col-span-7" />
					</div>
				) : !sessions || sessions.length === 0 ? (
					<div className="rounded-xl border border-[#dfd4c0] bg-[#fcf9f2] p-10 text-center shadow-sm">
						<p className="font-serif text-xl font-semibold text-[#2b2118]">No filed letters yet</p>
						<p className="mt-2 text-sm text-[#6b5c4d]">
							Once you start talking with Sam, your conversations will appear here.
						</p>
					</div>
				) : visibleSessions.length === 0 ? (
					<div className="rounded-xl border border-[#dfd4c0] bg-[#fcf9f2] p-8 text-center">
						<p className="text-sm text-[#6b5c4d]">
							No conversations match &ldquo;{query.trim()}&rdquo;. Try another word.
						</p>
					</div>
				) : (
					<div className="relative flex flex-col items-start lg:flex-row lg:items-center">
						{/* Left: Wooden Filed Letters Cabinet */}
						<div className="relative z-20 w-full max-w-md shrink-0 rounded-xl border-[3px] border-[#492e1b] bg-[#664126] p-3.5 shadow-[0_12px_26px_rgba(43,33,24,0.22),4px_4px_0_#53341e]">
							<div className="mb-2.5 flex items-baseline justify-between px-1 text-[#f6eee0]">
								<h1 className="font-serif text-xl font-medium tracking-tight">Filed letters</h1>
								<span className="text-xs text-[#dccab2]">
									{visibleSessions.length}{' '}
									{visibleSessions.length === 1 ? 'conversation' : 'conversations'}
								</span>
							</div>

							<div
								role="listbox"
								aria-label="Filed conversations"
								className="max-h-97.5 space-y-2.5 overflow-y-auto overflow-x-visible rounded-md bg-[#3c2414] p-3 pr-2.5 shadow-inner"
							>
								{visibleSessions.map((session, idx) => {
									const dateObj = parseSessionDate(session);
									const monthLabel = formatMonthGroup(dateObj) ?? 'November 2026';
									const showMonthHeader = idx === 0 || monthLabel !== lastMonthLabel;
									lastMonthLabel = monthLabel;

									const isHovered = hoveredId === session.session_id;
									const isConfirming = confirmingId === session.session_id;

									return (
										<div key={session.session_id} className="space-y-1.5">
											{showMonthHeader && (
												<div className="pt-0.5 text-xs font-semibold text-[#dfd0ba]">
													{monthLabel}
												</div>
											)}

											<div
												role="option"
												aria-selected={isHovered}
												tabIndex={0}
												onMouseEnter={() => launchLetterFromCabinet(session.session_id)}
												onMouseLeave={scheduleRetractToCabinet}
												onFocus={() => launchLetterFromCabinet(session.session_id)}
												onBlur={scheduleRetractToCabinet}
												onClick={() => {
													if (isConfirming) return;
													onSelectChat(session);
												}}
												onKeyDown={(e) => {
													if (e.target !== e.currentTarget || isConfirming) return;
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														onSelectChat(session);
													}
												}}
												className={`group relative flex cursor-pointer items-center justify-between gap-3 rounded-sm border px-3.5 py-2.5 text-left transition-transform duration-200 ease-out ${PRESS} ${FOCUS} ${
													isHovered
														? 'z-30 translate-x-2 border-[#b8a68e] bg-[#78634d]/95 text-[#231a12] shadow-lg'
														: 'z-10 translate-x-0 border-[#dfd2bc] bg-[#f8f2e4] text-[#2b2118] hover:border-[#c8b89e] hover:bg-[#fbf7ee]'
												}`}
												style={{
													backgroundImage: isHovered
														? undefined
														: `${AIRMAIL_STRIPE}, linear-gradient(#f8f2e4, #f8f2e4)`,
													backgroundSize: '100% 6px, 100% 100%',
													backgroundRepeat: 'no-repeat',
												}}
											>
												<span className="min-w-0 flex-1 truncate font-serif text-base font-semibold">
													{session.session_name || 'Untitled conversation'}
												</span>

												<div className="flex shrink-0 items-center gap-2">
													<span
														className={`text-xs ${
															isHovered ? 'text-[#3f3226]' : 'text-[#7c6d5d]'
														}`}
													>
														{formatShortDate(dateObj, idx)}
													</span>

													<span
														className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
														onClick={(e) => e.stopPropagation()}
													>
														<IconButton
															label={`Delete chat: ${session.session_name}`}
															tone="danger"
															onClick={() => {
																setHoveredId(session.session_id);
																setConfirmingId(session.session_id);
															}}
														>
															<TrashIcon />
														</IconButton>
													</span>
												</div>
											</div>
										</div>
									);
								})}
							</div>

							{/* Brass Drawer Pull Handle */}
							<div className="mt-3 flex justify-center">
								<div
									aria-hidden="true"
									className="h-3.5 w-16 rounded-full border border-[#8e6a32] bg-linear-to-b from-[#d8b46c] via-[#b88e46] to-[#8d682b] shadow-sm"
								/>
							</div>
						</div>

						{/* Right Slot: Correspondence Desk Idle Card + Flying Letter Sheet */}
						<div className="relative mt-6 w-full max-w-2xl lg:mt-0 lg:ml-8">
							{/* Default / Resting Desk Card when not flying out */}
							<div
								aria-hidden={Boolean(activeSession)}
								className={`transition-opacity duration-200 ${
									activeSession ? 'pointer-events-none opacity-0' : 'opacity-100'
								}`}
							>
								<div className="rounded-xs border border-[#dcd0ba] bg-[#fcf9f2] p-3 shadow-[0_8px_22px_rgba(43,33,24,0.08)]">
									<div className="flex h-64 w-full flex-col justify-end overflow-hidden rounded-xs bg-linear-to-br from-[#e7d6be] via-[#d7be9e] to-[#b9966d] p-6">
										<div className="rounded-xs border border-[#e8dcc7]/80 bg-[#fbf6ec]/90 px-4 py-2.5 backdrop-blur-2xs">
											<p className="font-serif text-lg text-[#2b2118]">
												From the correspondence desk
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Letter Sheet Flying Out From Cabinet (half-transparent in flight -> solid on arrival) */}
							{activeSession && (
								<div
									key={`${activeSession.session_id}-${flightKey}`}
									onMouseEnter={() => {
										if (leaveTimerRef.current !== null) {
											window.clearTimeout(leaveTimerRef.current);
											leaveTimerRef.current = null;
										}
										setHasLanded(true);
									}}
									onMouseLeave={scheduleRetractToCabinet}
									className={`absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 transition-all duration-300 ease-out ${
										hasLanded
											? 'translate-x-0 opacity-100'
											: '-translate-x-44 scale-[0.97] opacity-50'
									}`}
								>
									{/* Stacked bottom sheet */}
									<div
										aria-hidden="true"
										className="pointer-events-none absolute inset-x-2 top-2 -bottom-2 rounded-xs border border-[#dcd0ba] bg-[#f3ecdc] shadow-xs"
									/>

									<article
										className="relative overflow-hidden rounded-xs border border-[#dcd0ba] bg-[#fcf9f2] px-7 pb-7 pt-8 shadow-[0_14px_30px_rgba(43,33,24,0.14)] sm:px-9"
										style={{
											backgroundImage: `${AIRMAIL_STRIPE}, linear-gradient(#fcf9f2, #fcf9f2)`,
											backgroundSize: '100% 6px, 100% 100%',
											backgroundRepeat: 'no-repeat',
										}}
									>
										{/* Sender Stamp + Date */}
										<div className="mb-6 flex items-center justify-between gap-4">
											<div className="flex items-center gap-3">
												<div
													aria-hidden="true"
													className="flex h-9 w-9 items-center justify-center border border-dashed border-[#465a45] bg-[#4b5e49] font-serif text-base italic text-[#f6f1e5]"
												>
													S
												</div>
												<span className="text-xs font-medium text-[#6f6050]">Sam to you</span>
											</div>

											<time className="text-xs text-[#7c6d5d]">
												{formatFullDate(parseSessionDate(activeSession), activeIndex)}
											</time>
										</div>

										{/* Letter Title & Excerpt */}
										<h2 className="font-serif text-3xl font-normal leading-tight text-[#231a12] sm:text-4xl">
											{activeSession.session_name || 'Untitled conversation'}
										</h2>

										<p className="mt-4 max-w-xl text-base leading-relaxed text-[#5e5042]">
											{previewSnippet}
										</p>

										{/* Actions: Read conversation + Put back */}
										<div className="mt-7 flex flex-wrap items-center gap-3">
											<Button
												variant="primary"
												onClick={() => onSelectChat(activeSession)}
												className="rounded-xs! border-[#3f503d]! bg-[#495c47]! px-5 py-2.5 text-sm font-medium text-[#f8f5ed]! hover:bg-[#3d4e3b]!"
											>
												Read conversation
											</Button>

											{confirmingId === activeSession.session_id ? (
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-xs text-[#7c3528]">Delete this letter?</span>
													<Button
														variant="primary"
														size="sm"
														className="rounded-xs! border-[#7c3528]! bg-[#7c3528]! hover:bg-[#64281d]!"
														onClick={() => {
															onDeleteChat(activeSession.session_id);
															setConfirmingId(null);
														}}
													>
														Confirm delete
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setConfirmingId(null)}
													>
														Keep
													</Button>
												</div>
											) : (
												<Button
													variant="ghost"
													onClick={() => setConfirmingId(activeSession.session_id)}
													className="rounded-xs! border border-[#d6c9b4] bg-[#fbf8f2] px-4 py-2.5 text-sm font-medium text-[#3b2f24] hover:bg-[#f2eadb]"
												>
													Put back
												</Button>
											)}
										</div>
									</article>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}