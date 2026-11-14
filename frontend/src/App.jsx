// import { useState, useEffect, useRef } from 'react';
import { useState } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { Input } from './components/buttons/Input';
import { InitialMood } from './components/chat/InitialMood';
import { ChatThread } from './components/chat/ChatThread';
import { PastChatsView } from './components/views/PastChatsView';
import { LoginView } from './components/views/LoginView';
import { SettingsView } from './components/views/SettingsView';
import './App.css';

function App() {
	// start in the loginview -> no guest state for now
	const [activeTab, setActiveTab] = useState('login'); 
	const [messages, setMessages] = useState([]);
	const [inputVal, setInputVal] = useState('');
	const [sessionId, setSessionId] = useState(null);
	const [sessions, setSessions] = useState([]);
	// IF IMPLEMENT GUEST STATE
	// const sessionFetched = useRef(false);

	// to simulate thinking -> more empathetic (?)
	const waitOneSecond = () => new Promise((resolve) => setTimeout(resolve, 1000));
	const [isTyping, setIsTyping] = useState(false);

	// userId = null -> not logged in
	const [userId, setUserId] = useState(null);

	const BASE = "http://localhost:8000";

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
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
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
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
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
		// remove save current session if no use
		saveCurrentSession();
    	setActiveTab('chat');
    	setMessages([]);
    	setInputVal('');
		setSessionId(null);
	};
	
	// get msg from user and display
	const handleSubmit = async (e) => {
    	e.preventDefault();

		// so user cant send a msg when the agent is responding
		if (isTyping) return;

    	const trimmedInput = inputVal.trim();
    	if (!trimmedInput) return;

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
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
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
			const logoutResponse = await fetch(`${BASE}/login/logout`, {
				method: 'GET',
				credentials: 'include',
			});


			const loggedOut = await logoutResponse.json();
			// DEBUGGING ONLY 
			console.log("am i able to logout...???", loggedOut.logout);

			// successfully logging out clear all msgs and session id and user id
			// bring user back to the logout state
			if (loggedOut.logout === 'successful') {
				setUserId(null);
				setMessages([]);
				setSessionId(null);
				setActiveTab('login');

				// DEBUGGING ONLY
				console.log("logging out userid: ", userId);
				console.log("logging out sessionid: ", sessionId);
				console.log("successfully logged out :D");
				return;
			}

			// failed to logout idk what we should do yet
			console.log("erm could not logout successfully.....oopsies");
			
		}
		catch (error) {
			console.log(error);
			console.log("error in logging out");
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
				credentials: 'include',
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

  	return (
    	<div className="flex h-screen w-full bg-[#f6f7f5] text-gray-800 font-sans">

			{activeTab === 'login' ? (
				<LoginView
					onBackToChat={() => setActiveTab('chat')}
					onLoginSuccess={(loginId, loginSessions) => {
						setUserId(loginId);
						// used for retrieving past chats
						setSessions(loginSessions);
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
							/>
						) : activeTab === 'settings' ? (
							<SettingsView 
								onBackToChat={() => setActiveTab('chat')} 
							/>
						) : (
							<div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
								{messages.length === 0 ? (
								<div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
									<div className="space-y-3">
									<h1 className="text-4xl font-extrabold text-gray-900">Welcome</h1>
									<p className="text-2xl text-gray-700">How was your day ?</p>
									</div>
									<InitialMood onSelectMood={handleMoodSelect} />
								</div>
								) : (
								<div className="flex-1 flex flex-col overflow-y-auto">
									{/* for the thinking before responding of the agent */}
									<ChatThread messages={messages} isTyping={isTyping} />
								</div>
								)}

								<div className="p-6 max-w-4xl w-full mx-auto">
								<Input
									value={inputVal}
									onChange={(e) => setInputVal(e.target.value)}
									onSubmit={handleSubmit}
									placeholder={messages.length === 0 ? "What is your question" : "Reply..."}
									
								/>
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