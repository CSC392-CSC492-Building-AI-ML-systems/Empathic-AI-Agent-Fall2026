import { useState, useEffect, useRef, SyntheticEvent } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { Input } from './components/buttons/Input';
import { IconButton } from './components/buttons/IconButton';
import { HeartIcon, MenuIcon, MicIcon } from './components/buttons/Icons';
import { InitialMood } from './components/chat/InitialMood';
import { ChatThread } from './components/chat/ChatThread';
import { PastChatsView } from './components/views/PastChatsView';
import { LoginView } from './components/views/LoginView';
import { SettingsView } from './components/views/SettingsView';
import { supabase } from './lib/supabaseClient';
import { AuthCallback } from './components/views/AuthCallback';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import type { ActiveTab, ChatMessage, ChatSession, Mood, SidebarTab, Theme, BackendHistoryItem } from './types/chat';
import './App.css';

// default msg when backend connections iffy -> .no auto failure
const CONNECTION_FALLBACK = "Pardon? I don't think I understood correctly, can you repeat what you said again?";

function App() {
	// start in the loginview -> no guest state for now
	const [activeTab, setActiveTab] = useState<ActiveTab>('login'); 
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputVal, setInputVal] = useState<string>('');
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [sessions, setSessions] = useState<ChatSession[]>([]);
	// userId = null -> not logged in
	const [userId, setUserId] = useState<string | null>(null);
	const [username, setUsername] = useState<string>('User');
	const baseTextRef = useRef('');
	// IF IMPLEMENT GUEST STATE
	// const sessionFetched = useRef(false);

	// to simulate thinking -> more empathetic (?)
	const waitOneSecond = () => new Promise((resolve) => setTimeout(resolve, 1000));
	const [isTyping, setIsTyping] = useState(false);
	const [isLoadingSessions, setIsLoadingSessions] = useState(false);

	// small screens: is the sidebar drawer open?
	const [sidebarOpen, setSidebarOpen] = useState(false);

	// for authentication
	const isAuthCallback = window.location.pathname === '/auth/callback';

	const BASE = "http://localhost:8000";

	// for personalization/customization
	const [theme, setTheme] = useState<Theme>('light');
	const [samPFP, setSamPFP] = useState<null | string>(null);
	const [userPFP, setUserPFP] = useState<null | string>(null);
	const [samName, setSamName] = useState<string>('Sam');

	// for speech to text
	const {
		listening,
		resetTranscript,
		browserSupportsSpeechRecognition,
	} = useSpeechRecognition();

	const handleToggleMic = () => {
		if (listening) {
			SpeechRecognition.stopListening();
		} 
		else {
			const trimmedBase = inputVal.trim();
			baseTextRef.current = trimmedBase ? `${trimmedBase} ` : '';
			resetTranscript();
			SpeechRecognition.startListening({
				continuous: true,
				language: 'en-US',
				onResult: (result: string) => {
					setInputVal(`${baseTextRef.current}${result}`);
				},
			});
		}
	};

	useEffect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, [theme]);

	const handleToggleTheme = () => {
		setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
	};

	// Get the current Supabase access token and prepare request headers
	const getAuthHeaders = async () => {
		const { data, error } = await supabase.auth.getSession();

		if (error || !data.session) {
			throw new Error('No authenticated Supabase session');
		}

		return {'Content-Type': 'application/json',
			'Authorization': `Bearer ${data.session.access_token}`,
		};
	};

	// starting a session with the backend
	// occurs AFTER sending one message
	// RETURNS the agent's response
	// SETS the session id
	// null -> failed to create session
	const startSession = async (payload: { text: string }): Promise<string | null> => {
		console.log("starting a new session, will get agent's respnse and session id");
		console.log("sending first msg: ", payload);

		// backend API call
		try {
			const startSessionResponse = await fetch(`${BASE}/session/`, {
				method: 'POST', 
				headers: await getAuthHeaders(),
				body: JSON.stringify({ message: payload.text }),

			});

			// failed to create a new session -> print status to know why
			if (!startSessionResponse.ok) {
				console.log("failed to create session, status:", startSessionResponse.status);
				return null;
			}
			
			const startedSession = await startSessionResponse.json();

			// invalid user login state -> send back to login view
			if (startedSession.session_id === 'ERROR: unverified cookie') {
				setUserId(null);
				setMessages([]);
				setActiveTab('login');
				return null;
			}

			setSessionId(startedSession.session_id);
			console.log("cureent session id: ", startedSession.session_id);

			// agent response
			return startedSession.response;
		}
		catch (error) {
			console.log(error);
			console.log("error in starting a new session");
			return null;
		}
	}

	// immediately create a session
	// runs when compopnent first loads
	// keeping in case we decide to do guest state later on
	// useEffect(() => {
	//	if (!sessionFetched.current) {
	//		sessionFetched.current = true;
	//		startSession();
	//	}
	// }, []);

	// backend integration
	const sendToBackend = async (payload: { text: string }): Promise<string | null> => {
		// no session yet -> don't send to /session/null/message
		if (!sessionId) {
			console.log("No session id yet, can't send message");
			return null;
		}
		console.log("Sending payload to backend:", payload);
    
		// backend API call
		try {
			const response = await fetch(`${BASE}/session/${sessionId}/message`, {
				method: 'POST',
				headers: await getAuthHeaders(),
				body: JSON.stringify({ message: payload.text }),
			});

			// checking for 4xx/5xx responses
			if (!response.ok) {
				console.log("Backend error, status:", response.status);
				return null;
			}

			const backendResponse = await response.json();
			console.log("Received from backend: ", backendResponse);
			return backendResponse.response;

		}
		catch (error) {
			console.log("Error in sending msg to backend", error);
			return null;
		}
	};

	const handleMoodSelect = (mood: Mood) => {
		// hv default response based on the user's initial mood
		// seem more human
		let initialResponse = "How can I help you today?";
		if (mood === 'terrible') {
			initialResponse = "Oh no, I'm sorry to hear that. What happened today?";
		} 
		else if (mood === 'great' || mood === 'good') {
			initialResponse = "Glad to hear that! What's on your mind today?";
		} 
		else if (mood === 'alright') {
			initialResponse = "Hope your day gets better! How can I assist you?";
		}


		// show initial response like a chat bubble based on user's initial mood
		setMessages([
			{ id: Date.now(), sender: 'sam', text: initialResponse },
		]);

	};

	// new chat resetting everything
	// save curr session to sessions if there are messages
	// brings back to og state
	const handleNewChat = () => {
		if (listening) {
			SpeechRecognition.stopListening();
		}
		// remove save current session if no use
		saveCurrentSession();
    	setActiveTab('chat');
    	setMessages([]);
    	setInputVal('');
		setSessionId(null);
	};

	// right clicking on a msg to bring to a new chat
	const handleBranch = async (index: number) => {
		const msg = messages[index];
		if (isTyping) return;

		// fresh chat, no session yet
		setActiveTab('chat');
		setSessionId(null);
		setInputVal('');
		setMessages([{ ...msg, id: Date.now(), timestamp: new Date().toISOString() }]);

		// agent message -> just show it as the first bubble
		// nothing goes to the backend, the user's first reply starts the session like normal
		if (msg.sender === 'sam') return;

		// user message -> send it as the first message of the new session
		setIsTyping(true);
		const [agentResponse] = await Promise.all([
			startSession({ text: msg.text }),
			waitOneSecond(),
		]);

		setMessages((prev) => [
			...prev,
			{
				id: Date.now() + 1,
				sender: 'sam',
				text: agentResponse ?? CONNECTION_FALLBACK,
				timestamp: new Date().toISOString(),
			},
		]);
		setIsTyping(false);
	};
	
	// get msg from user and display
	const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    	e.preventDefault();

		// so user cant send a msg when the agent is responding
		if (isTyping) return;

    	const trimmedInput = inputVal.trim();
    	if (!trimmedInput) return;

		if (listening) {
			SpeechRecognition.stopListening();
		}

		const userMsg = { 
			id: Date.now(), 
			sender: 'user', 
			text: trimmedInput, 
			timestamp: new Date().toISOString()
		};

		setMessages((prev) => [...prev, userMsg]);

		// prepare and send msg to backend
		const userMessagePayload = {
			text: trimmedInput,
			sender: 'user',
			timestamp: new Date().toISOString(),
		};

		setInputVal('');
		setIsTyping(true);

		// decide which call to backend we use
		// first msg -> start a session and get session id
		// everything else -> send msg normally
		let backendCall;
		if (sessionId) {
			backendCall = sendToBackend(userMessagePayload);
		}

		else {
			backendCall = startSession(userMessagePayload);
		}

		// sending msg to backend and receiving response
		// but we wait and have the delay
		const [agentResponse] = await Promise.all([
			backendCall,
			waitOneSecond()
		]);

		// TODO
		// check if agentResponse indicates we should create a popup
		// yes -> save to sessions and open new chat
		// no -> stay in current chat

		// TODO
		// check if agentResponse indicates we should terminate the session
		// what should i do

		// will need to get response from backend
		// display agent response
		const agentMsg = { 
			id: Date.now() + 1,
			sender: 'sam', 
			// ?? falls back on null so if agentResponse = null -> we ask user for input again
			text: agentResponse ?? CONNECTION_FALLBACK,
			timestamp: new Date().toISOString()
		};
		console.log("THIS IS MY CURR SESSID: ", sessionId);
		setMessages((prev) => [...prev, agentMsg]);
		setIsTyping(false);
		
 	};

  	const sidebarTabState: SidebarTab =
		activeTab === 'settings'
		? 'settings'
		: activeTab === 'login' || activeTab === 'signup'
		? 'login'
    	: activeTab === 'pastChats'
      	? 'pastChats'
      	: messages.length === 0
      	? 'chat_new'
      	: 'chat_active';

	// showing the temp past chats
	const handleSelectPastChat = async (chatSession: ChatSession) => {
		// get the actual chat from the backend
		try {
			const pastChatResponse = await fetch(`${BASE}/session/${chatSession.session_id}`, {
				method: 'POST',
				headers: await getAuthHeaders(),
			});

			if (!pastChatResponse.ok) {
				console.log("failed to load convo history");
				return;
			}

			// response from backend is list of all convo history
			// each past chat history has role, content, created_at
			const pastChats = await pastChatResponse.json();
			// populate convo history so we can set into msgs
			
			const convoHistory = pastChats.map((pastChatHistory: BackendHistoryItem): ChatMessage => ({
				id: crypto.randomUUID(),
				sender: pastChatHistory.role === 'assistant' ? 'sam' : 'user',
				text: pastChatHistory.content,
				timestamp: pastChatHistory.created_at
			}));
			console.log("this is all past convo history", convoHistory);
			setMessages(convoHistory);
			setSessionId(chatSession.session_id);
		}
		
		catch (error) {
			console.log(error);
			console.log("error in retrieving past chat with a session");
		}

		
		setActiveTab('chat');
	};


	const handleOpenPastChats = () => {
		// save current session
		// saveCurrentSession();
		// get all session when im about to open all the past chats
		getAllSessions({ showLoading: sessions.length === 0 });
		setActiveTab('pastChats');
	};

	const handleLogout = async () => {
		try {
			const { error } = await supabase.auth.signOut();

			if (error) {
				console.error('Logout failed:', error);
				return;
			}

			// Clear frontend state
			setUserId(null);
			setUsername('User');
			setMessages([]);
			setSessionId(null);
			setSessions([]);
			setInputVal('');
			setActiveTab('login');

			console.log('Successfully logged out!');
		}
		catch (error) {
			console.error('Error logging out:', error);
		}
	};

	const saveCurrentSession = () => {
		{/*
		// save if there's an active session and some messages
		if (!sessionId || messages.length === 0) return;

		// check if this session is already in the sessions list
		const existingIndex = sessions.findIndex(s => s.session_id === sessionId);

		// create temp session name
		// replace with calling backend to generate a session name
		const sessionName = "temp";

		if (existingIndex >= 0) {
			// Update existing session in state if needed
			const updatedSessions = [...sessions];
			updatedSessions[existingIndex] = {
				session_id: sessionId,
				session_name: sessionName
			};
			setSessions(updatedSessions);
		} 
		else {
			// Append new session to the top/bottom of the array
			setSessions(prev => [
				{ session_id: sessionId, session_name: sessionName },
				...prev
			]);
		}
		*/}
		return;
	};

	// retrieve all the sessions from the backend
	const getAllSessions = async ({ showLoading = true }: { showLoading?: boolean } = {}): Promise<void> => {
		if (showLoading) {
			setIsLoadingSessions(true);
		}
		try {

			const sessionsResponse = await fetch(`${BASE}/session/get_sessions`, {
				method: 'GET',
				headers: await getAuthHeaders(),
			});

			if (!sessionsResponse.ok) {
				console.log("failed to retrieve all sessions");
				return;
			}

			const allSessions = await sessionsResponse.json();
			setSessions(allSessions.sessions ?? []);
		}
		catch (error) {
			console.log(error);
			console.log("error in retrieving all sessions");
		}
		finally {
			if (showLoading) {
				setIsLoadingSessions(false);
			}
		}
    };

	const handleDeleteChat = async (sessionIdToDelete: string): Promise<void> => {
		try {
			const deleteResponse = await fetch(`${BASE}/session/${sessionIdToDelete}/delete`, {
				method: 'POST',
				headers: await getAuthHeaders(),
			});
			
			if (!deleteResponse.ok) {
				console.log("failed to delete session");
				return;
			}
		}
		catch (error) {
			console.log(error);
			console.log("error in deleting session");
		}

		// update the sessions state to remove the deleted session
		setSessions((prevSessions) =>
			prevSessions.filter((session) => session.session_id !== sessionIdToDelete)
		);
	};

	// "Welcome, Sam" only once we actually know the name
	const displayName = username && username !== 'User' ? username : '';

  	return (
    	<div className="flex h-dvh w-full bg-[#f6f7f5] dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-sans transition-colors duration-200 antialiased">

			{isAuthCallback ? (
				<AuthCallback
					onLoginSuccess={(loginId, loginSessions) => {
						setUserId(loginId);
						setSessions(loginSessions);
						window.history.replaceState({}, '', '/');
						setActiveTab('chat');
					}}
				/>

			) : activeTab === 'login' ? (
				<LoginView
					onBackToChat={() => setActiveTab('chat')}
					onLoginSuccess={(loginId, loginSessions, loginUsername) => {
						setUserId(loginId);
						// used for retrieving past chats
						setSessions(loginSessions);
						if (loginUsername) {
							setUsername(loginUsername);
						}
						window.history.replaceState({}, '', '/');
						console.log(`this is the userId: ${loginId}`);
						console.log(`these are all the sessions associated with this user: ${loginSessions}`);
						setTimeout(() => setActiveTab('chat'), 2000);
					}}
				/>
			) : (
				<>
					<Sidebar
						activeTab={sidebarTabState}
						onNewChat={handleNewChat}
						onOpenPastChats={handleOpenPastChats}
						// onOpenLogin={() => setActiveTab('login')}
						onOpenSettings={() => setActiveTab('settings')}
						isLoggedIn={Boolean(userId)}
						onLogout={handleLogout}
						isOpen={sidebarOpen}
						onClose={() => setSidebarOpen(false)}
						username={username}
						userPFP={userPFP}
					/>

					<main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
						{/* top bar with the menu button, small screens only */}
						<header className="md:hidden shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200/70 dark:border-slate-800 bg-[#f6f7f5] dark:bg-slate-900">
							<IconButton label="Open menu" onClick={() => setSidebarOpen(true)}>
								<MenuIcon />
							</IconButton>
							<div className="flex items-center gap-2">
								<HeartIcon />
								<span className="font-bold text-lg tracking-tight text-gray-900 dark:text-slate-100">chat</span>
							</div>
						</header>

						{activeTab === 'pastChats' ? (
							<PastChatsView 
								onSelectChat={handleSelectPastChat} 
								sessions={sessions}
								onDeleteChat={handleDeleteChat}
								isLoading={isLoadingSessions}
							/>
						) : activeTab === 'settings' ? (
							<SettingsView 
								onBackToChat={() => setActiveTab('chat')} 
								theme={theme}
								onToggleTheme={handleToggleTheme}
								samPFP={samPFP}
								onSelectSamPFP={setSamPFP}
								userPFP={userPFP}
								onSelectUserPFP={setUserPFP}
								samName={samName}
								onChangeSamName={setSamName}
							/>
						) : (
							<div className="flex-1 min-h-0 flex flex-col">
								{messages.length === 0 ? (
									<div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-6 py-8 text-center gap-8">
										<div className="space-y-3">
											<h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
												{displayName ? `Welcome, ${displayName}` : 'Welcome'}
											</h1>
											<p className="text-xl sm:text-2xl text-gray-600 dark:text-slate-300">How was your day?</p>
										</div>
										<InitialMood onSelectMood={handleMoodSelect} />
									</div>
								) : (
									<ChatThread 
										messages={messages} 
										isTyping={isTyping} 
										onBranch={handleBranch}
										canBranch={!isTyping}
										samPFP={samPFP}
										userPFP={userPFP}
										samName={samName}
										username={username}
									/>
								)}

								{/* message box */}
								<div className="shrink-0 px-4 sm:px-6 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] max-w-4xl w-full mx-auto">
									{listening && (
										<p role="status" className="px-3 pb-2 text-sm text-red-600 dark:text-red-400">
											Listening... tap the microphone when you're done.
										</p>
									)}
									<Input
										value={inputVal}
										onChange={(e) => {
											if (listening) SpeechRecognition.stopListening();
											setInputVal(e.target.value);
										}}
										onSubmit={handleSubmit}
										disabled={false}
										submitDisabled={isTyping}
										placeholder={messages.length === 0 ? "Type in your message..." : "Type your message..."}
									>
										{browserSupportsSpeechRecognition && (
											<IconButton
												label={listening ? 'Stop voice input' : 'Speak to type'}
												onClick={handleToggleMic}
												disabled={isTyping}
												tone={listening ? 'active' : 'default'}
												className={listening ? 'animate-pulse motion-reduce:animate-none' : ''}
											>
												<MicIcon />
											</IconButton>
										)}
									</Input>
								</div>
							</div>
						)}
					</main>
				</>
			)}
		</div>
	);
}

export default App;