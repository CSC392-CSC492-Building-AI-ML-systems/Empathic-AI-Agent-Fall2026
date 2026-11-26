// import { useState, useEffect, useRef } from 'react';
import { useState, useEffect } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { Input } from './components/buttons/Input';
import { InitialMood } from './components/chat/InitialMood';
import { ChatThread } from './components/chat/ChatThread';
import { PastChatsView } from './components/views/PastChatsView';
import { LoginView } from './components/views/LoginView';
import { SettingsView } from './components/views/SettingsView';
import { supabase } from './lib/supabaseClient';
import { AuthCallback } from './components/views/AuthCallback';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './App.css';

function App() {
	// start in the loginview -> no guest state for now
	const [activeTab, setActiveTab] = useState('login'); 
	const [messages, setMessages] = useState([]);
	const [inputVal, setInputVal] = useState('');
	const [sessionId, setSessionId] = useState(null);
	const [sessions, setSessions] = useState([]);
	// userId = null -> not logged in
	const [userId, setUserId] = useState(null);
	const [username, setUsername] = useState('User');
	// IF IMPLEMENT GUEST STATE
	// const sessionFetched = useRef(false);

	// to simulate thinking -> more empathetic (?)
	const waitOneSecond = () => new Promise((resolve) => setTimeout(resolve, 1000));
	const [isTyping, setIsTyping] = useState(false);

	// for authentication
	const isAuthCallback = window.location.pathname === '/auth/callback';

	const BASE = "http://localhost:8000";

	// for personalization/customization
	const [theme, setTheme] = useState('light');
	const [samPFP, setSamPFP] = useState(null);
	const [userPFP, setUserPFP] = useState(null);
	const [samName, setSamName] = useState('SAM');

	// for speech to text
	const {
		transcript,
		listening,
		resetTranscript,
		browserSupportsSpeechRecognition,
	} = useSpeechRecognition();

	useEffect(() => {
	if (listening) {
		setInputVal(`${baseTextRef.current}${transcript}`);
	}
}, [transcript, listening]);

	const handleToggleMic = () => {
		if (listening) {
			SpeechRecognition.stopListening();
		} 
		else {
			const trimmedBase = inputVal.trim();
			baseTextRef.current = trimmedBase ? `${trimmedBase} ` : '';
			resetTranscript();
			SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
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
	const startSession = async (payload) => {
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
	const sendToBackend = async (payload) => {
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

	const handleMoodSelect = (mood) => {
		// hv default response based on the user's initial mood
		// seem more human
		let initialResponse = "How can I help you today?";
		if (mood === 'terrible') {
			initialResponse = "Oh no, what happened? Why was your day terrible";
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
	const handleBranch = async (index) => {
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
				text: agentResponse ?? "Sorry, can you repeat what you said one more time?",
				timestamp: new Date().toISOString(),
			},
		]);
		setIsTyping(false);
	};
	
	// get msg from user and display
	const handleSubmit = async (e) => {
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
			text: agentResponse ?? "Sorry, can you repeat what you said one more time?",
			timestamp: new Date().toISOString()
		};
		console.log("THIS IS MY CURR SESSID: ", sessionId);
		setMessages((prev) => [...prev, agentMsg]);
		setIsTyping(false);
		
 	};

  	const sidebarTabState =
		activeTab === 'settings'
		? 'settings'
		: activeTab === 'login' || activeTab === 'signup'
		? 'login'
    	: activeTab === 'past_chats'
      	? 'past_chats'
      	: messages.length === 0
      	? 'chat_new'
      	: 'chat_active';

	// showing the temp past chats
	const handleSelectPastChat = async (chatSession) => {
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
			
			const convoHistory = pastChats.map((pastChatHistory) => ({
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
		getAllSessions();
		setActiveTab('past_chats');
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
	const getAllSessions = async () => {
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
			setSessions(allSessions.sessions);
		}
		catch (error) {
			console.log(error);
			console.log("error in retrieving all sessions");
		}
    };

	const handleDeleteChat = async (sessionIdToDelete) => {
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


  	return (
    	<div className="flex h-screen w-full bg-[#f6f7f5] dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-sans transition-colors duration-200">

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
					/>

					<main className="flex-1 flex flex-col h-full overflow-hidden relative">
						{activeTab === 'past_chats' ? (
							<PastChatsView 
								onSelectChat={handleSelectPastChat} 
								sessions={sessions}
								onDeleteChat={handleDeleteChat}
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
							<div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
								{messages.length === 0 ? (
								<div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
									<div className="space-y-3">
									<h1 className="text-4xl font-extrabold text-gray-900 dark:text-slate-100">Welcome</h1>
									<p className="text-2xl text-gray-700 dark:text-slate-300">How was your day ?</p>
									</div>
									<InitialMood onSelectMood={handleMoodSelect} />
								</div>
								) : (
								<div className="flex-1 flex flex-col overflow-y-auto">
									{/* for the thinking before responding of the agent */}
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
								</div>
								)}

								<div className="p-6 max-w-4xl w-full mx-auto">
									<Input
										value={inputVal}
										onChange={(e) => {
											if (listening) SpeechRecognition.stopListening();
											setInputVal(e.target.value);
										}}
										onSubmit={handleSubmit}
										disabled={isTyping}
										placeholder={messages.length === 0 ? "What is your question" : "Reply..."}
									>
										{browserSupportsSpeechRecognition && (
											<button
												type="button"
												onClick={handleToggleMic}
												disabled={isTyping}
												aria-label={listening ? 'Stop voice input' : 'Start voice input'}
												title={listening ? 'Stop listening' : 'Speak to type'}
												className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
													listening
														? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 animate-pulse'
														: 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/60'
												}`}
											>
												<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
													/>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
													/>
												</svg>
											</button>
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