import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { ChatThread } from '../chat/ChatThread';
import { Input } from '../buttons/Input';
import { supabase } from '../../lib/supabaseClient';
import { TwoOptionButton } from '../buttons/TwoOptionButton';
import { Button } from '../buttons/Button';
import { PRESS, FOCUS } from '../buttons/styles';
import type { User } from '@supabase/supabase-js';
import type { ChatMessage, ChatSession, LoginStatus, LoginOrSignup } from '../../types/chat';

interface LoginViewProps {
	onLoginSuccess: (userId: string, sessions: ChatSession[], username?: string) => void;
	onBackToChat?: () => void;
}

const GREETING = "Hi! I'm Sam :) Would you like to log in or create an account?";
const PASSWORD_RULES =
	'Please use at least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol (like ! or ?).';

// add in onBackToChat when implement guest state
export function LoginView({ onLoginSuccess }: LoginViewProps) {

	// initial message from agent
	const [messages, setMessages] = useState<ChatMessage[]>(() => [
		{ id: crypto.randomUUID(), sender: 'sam', text: GREETING, timestamp: new Date().toISOString() }
	]);

	const [inputVal, setInputVal] = useState('');
	const [error, setError] = useState('');

	// status = 'name' | 'confirmName' | 'email' | 'confirmEmail' | 'password' | 'confirmPassword' | 'awaitingVerification' | 'done'
	// confirming password and awaiting verification are only for signup, NOT login
	const [status, setStatus] = useState<LoginStatus>('');

	// login + password -> ask for their set password
	// signup + password -> ask them to create a password
	const [loginOrSignup, setLoginOrSignup] = useState<LoginOrSignup>('');

	// only confirm name after user types in a valid input
	const [username, setUsername] = useState('');
	const [pendingName, setPendingName] = useState('');

	const [email, setEmail] = useState('');
	const [pendingEmail, setPendingEmail] = useState('');

	const [password, setPassword] = useState('');
	// so we hide/show password in the input
	const [showPassword, setShowPassword] = useState(false);
	const [passwordAttempts, setPasswordAttempts] = useState(0);

	// to simulate thinking -> more empathetic (?)
	const waitOneSecond = () => new Promise((resolve) => setTimeout(resolve, 1000));
	const [isTyping, setIsTyping] = useState(false);

	const [userId, setUserId] = useState('')

	// const BASE = "http://localhost:8000";

	const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		// so user cant send a msg when the agent is responding
		if (isTyping) return;

		const trimmedInput = inputVal.trim();
		if (!trimmedInput) return;

		console.log("------------------start of trying to login/signup-----------------------");
		printAllFields();

		// check for username
		if (status === 'name') {
			const usernameRegex = /^\w+$/;
			if (!usernameRegex.test(trimmedInput)) {
				setError('Your name can use letters, numbers, and underscores, with no spaces. Could you try another one?');
				return;
			}
			setError('');
			setPendingName(trimmedInput);

			await userMsg(trimmedInput);
			await agentMsg(`I will call you ${trimmedInput} from now on. Is that okay with you?`);

			setStatus('confirmName')
		}

		// check for email
		else if (status === 'email') {
			const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
			if (!emailRegex.test(trimmedInput)){
				setError("That email doesn't look quite right. It should look like name@example.com. Could you check it?");
				return;
			}
			setError('');
			setEmail(trimmedInput);

			await userMsg(trimmedInput);
			await agentMsg('Thanks for sharing your email with me!');

			if (loginOrSignup === 'login') {
				await agentMsg("Okay :) Please enter your password so I can help you log in.");
			}

			// user is signing up -> let user choose a password
			if (loginOrSignup === 'signup') {
				await agentMsg(`Got it! Now let's choose a password. ${PASSWORD_RULES}`);
			}

			setStatus('password')
		}

		else if (status === 'password') {

			// ---------- SIGNUP ----------
			if (loginOrSignup === 'signup') {
				if (trimmedInput.length < 8) {
					setError("Your password needs at least 8 characters. You're almost there!");
					return;
				}
				const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;
				if (!passwordRegex.test(trimmedInput)) {
					setError('Please include an uppercase letter, a lowercase letter, a number, and a symbol (like ! or ?).');
					return;
				}

				setError('');
				setShowPassword(false);
				setPassword(trimmedInput);

				// confirm that user typed in password correctly
				setStatus('confirmPassword');
				await agentMsg("Please enter your password one more time to make sure it's right.");
				return;

			}

			// ---------- LOGIN ----------
			// need to set check after 5 login attempts -> lock user out? and bring back to start(?)
			// CURRENTLY -> will just bring user back to the starting status
			if (loginOrSignup === 'login') {
				console.log("please");

				// attempt password >= 5 times -> send back to og state
				if (passwordAttempts + 1 >= 5) {
					// TODO !!!
					// DISABLE USER
					await agentMsg("That's a few tries, so let's start fresh. Take your time.");
					await resetAllFields();
					// await printAllFields();
					await agentMsg(GREETING);
					return;
				}

				const loginData = await loginToAccount(trimmedInput);
				if (!loginData || !loginData.user || !loginData.session){
					setShowPassword(false);
					await agentMsg("Hmm, that didn't work. Please double-check your email and password, then try again.");
					setPasswordAttempts(passwordAttempts + 1);
					return;
				}

				const userId = loginData.user.id;
				const name = extractUserName(loginData.user);
				setUsername(name);
				setUserId(userId);
				onLoginSuccess(userId, [], name);

				await agentMsg("Ok :D I have all the info I need now. You are all logged in now!");
				console.log("-----------------completed login---------------------");
				printAllFields();
				console.log("-----------------------------------------------------");
				setStatus('done');
				return;
			}
		}

		else if (status === 'confirmPassword') {
			console.log(trimmedInput);
			console.log(password);
			if (trimmedInput !== password) {
				await agentMsg("Those two passwords didn't match. No worries, let's try again.");
				await agentMsg(`Please choose a password. ${PASSWORD_RULES}`);
				setStatus('password');
				return;
			}

			setPassword(trimmedInput);

			// creating an account using supabase -> will send a verification email to the user
			const signupData = await createAccount(username, email, trimmedInput);

			if (!signupData || !signupData.user) {
				await agentMsg("Hmm, something went wrong creating your account. Please try a different password or try again later.");
				return;
			}

			if (!signupData.session){
				await agentMsg("I've sent you a verification email! Please check your inbox and click the link to finish creating your account.");
				// wait for email verification and then we're done!
				setStatus('awaitingVerification');
				return;
			}

			const newUserId = signupData.user.id;
			const name = extractUserName(signupData.user);
			setUsername(name);

			setUserId(newUserId);
			// signup -> new user -> no chat history
			onLoginSuccess(newUserId, [], name);
			// password is handled by supabase now

			await agentMsg(`Ok :D I have all the info I need now. It was a pleasure to meet you ${username}!`);
			console.log("-----------------completed signup---------------------");
			printAllFields();
			console.log("-----------------------------------------------------");
			setStatus('done');
			return;
		}
	};

	const isWaitingForConfirmation = status === 'confirmName' || status === 'confirmEmail';
	const isSignupOrLogin = status === '' && !isWaitingForConfirmation;

	const userMsg = async (text: string) => {
		setMessages((prev) => [...prev, {
			id: crypto.randomUUID(),
			sender: username !== '' ? username : 'user',
			text,
			timestamp: new Date().toISOString()
		}]);
	};

	const agentMsg = async (text: string) => {
		setInputVal('');
		setIsTyping(true);
		await waitOneSecond();
		setIsTyping(false);
		setMessages((prev) => [...prev, {
			id: crypto.randomUUID(),
			sender: 'sam',
			text,
			timestamp: new Date().toISOString()
		}]);
	};

	const handleConfirmYes = async () => {
		// so user cant send a msg when the agent is responding
		if (isTyping) return;

		if (status === 'confirmName') {
			await userMsg('Yes');

			await waitOneSecond();

			await agentMsg(`Nice to meet you ${pendingName}. What's your email?`);
			setUsername(pendingName);
			setStatus('email');
		}
	};

	const handleConfirmNo = async () => {
		// so user cant send a msg when the agent is responding
		if (isTyping) return;

		await userMsg('No');

		if (status === 'confirmName') {

			await agentMsg("Oops, maybe I misread that. What's your name again?");
			setIsTyping(false);
			setStatus('name');

		}
		else if (status === 'confirmEmail') {
			await agentMsg("No worries, maybe I misread that. What's your email again?");
			setIsTyping(false);
			setStatus('email');
		}
	};

	const handleLogin = async () => {
		// so user cant send a msg when the agent is responding
		if (isTyping) return;

		await userMsg('Log in');
		await agentMsg("Ok :) Please enter your email so I can help you log in.");

		setStatus('email');
		setLoginOrSignup('login');
	};

	const handleSignup = async () => {
		// so user cant send a msg when the agent is responding
		if (isTyping) return;

		await userMsg('Create account');
		await agentMsg("Ok :) I will help you create an account");
		await agentMsg("To start off, what would you like me to call you?");

		setStatus('name');
		setLoginOrSignup('signup');
	};

	const handleRestart = async () => {
		// so user cant send a msg when the agent is responding
		if (isTyping) return;
		await resetAllFields();
		await agentMsg(GREETING);
		return;
	};

	// using supabaset to login to an account -> returns data if successful, null if not
	const loginToAccount = async(password: string) => {
		try {
			const { data, error } =
				await supabase.auth.signInWithPassword({
					email,
					password
				});

			if (error) {
				console.error("Login error:", error.message);
				return null;
			}

			return data;
		}
		catch (error) {
			console.error("Error logging in:", error);
			return null;
		}
	};

	// using supabase to create an account -> returns data if successful, null if not
	const createAccount = async(name: string, email: string, password: string) => {
		try {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: { name },
					emailRedirectTo: "http://localhost:5173/auth/callback"
				}
			});

			if (error) {
				console.error("error in creating an account:((((( ", error.message);
				return null;
			}

			return data;
		}
		catch (error) {
			console.error("Error creating account:", error);
			return null;
		}
	};

	const extractUserName = (user: User | null | undefined) =>
		user?.user_metadata?.name ||
		user?.user_metadata?.full_name ||
		username ||
		'User';

	const resetAllFields = async() => {
		setUsername('');
		setPendingName('');
		setEmail('');
		setPendingEmail('');
		setPassword('');
		setPasswordAttempts(0);
		setUserId('');
		setMessages([]);
		setInputVal('');
		setStatus('');
		setError('');
		setLoginOrSignup('');
		return;
	};

	const printAllFields = async () => {
		console.log("username: ", username);
		console.log("pendingname: ", pendingName);
		console.log("email: ", email);
		console.log("pending email: ", pendingEmail);
		console.log("password: ", password);
		console.log("password attempts: ", passwordAttempts);
		console.log("user id: ", userId);
		return;
	};

	// helpers
	const isPasswordStep = status === 'password' || status === 'confirmPassword';

	const placeholderByStatus: Record<string, string> = {
		name: 'Type your name...',
		email: 'name@example.com',
		password: 'Enter your password...',
		confirmPassword: 'Enter your password again...',
	};
	const labelByStatus: Record<string, string> = {
		name: 'Your name',
		email: 'Your email',
		password: 'Password',
		confirmPassword: 'Confirm your password',
	};
	const autoCompleteFor = () => {
		if (status === 'email') return 'email';
		if (status === 'confirmPassword') return 'new-password';
		if (status === 'password') return loginOrSignup === 'signup' ? 'new-password' : 'current-password';
		return 'off';
	};

	return (
		<div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
			<div className="flex items-start justify-between gap-3 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-6 shrink-0">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">Login</h1>
					<p className="text-base text-gray-600 dark:text-slate-400 mt-1">
						Chat with Sam to log in or create an account.
					</p>
				</div>

				{status !== '' && status !== 'done' && (
					<Button variant="secondary" size="sm" onClick={handleRestart} disabled={isTyping} className="shrink-0">
						Start over ↻
					</Button>
				)}
			</div>

			<div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
				<ChatThread messages={messages} isTyping={isTyping} onBranch={undefined} />

				<div className="px-4 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 max-w-4xl w-full mx-auto">

					{error && (
						<p
							role="alert"
							className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-2.5 mb-3"
						>
							{error}
						</p>
					)}

					{isWaitingForConfirmation ? (
						<TwoOptionButton
							onOption1={handleConfirmYes}
							onOption2={handleConfirmNo}
							option1Text="Yes"
							option2Text="No"
							option1Variant="primary"
							option2Variant="secondary"
							disabled={isTyping}
						/>
					) : isSignupOrLogin ? (
						<TwoOptionButton
							onOption1={handleSignup}
							onOption2={handleLogin}
							option1Text="Create account"
							option2Text="Log in"
							option1Variant="primary"
							option2Variant="primary"
							disabled={isTyping}
						/>
					) : status === 'awaitingVerification' ? (
						<p role="status" className="text-center text-base text-gray-700 dark:text-slate-300">
							Almost there! Check your inbox and click the link we sent you.
						</p>
					) : status === 'done' ? (
						<p role="status" className="text-center text-base text-gray-700 dark:text-slate-300">
							You're all set. Taking you to your chat...
						</p>
					) : (
						<Input
							value={inputVal}
							onChange={(e) => {
								setInputVal(e.target.value);
								if (error) setError('');
							}}
							onSubmit={handleSubmit}
							placeholder={placeholderByStatus[status] ?? 'Type your response...'}
							ariaLabel={labelByStatus[status] ?? 'Your response'}
							autoComplete={autoCompleteFor()}
							type={isPasswordStep && !showPassword ? "password" : "text"}
						>
							{isPasswordStep && (
								<button
									type="button"
									onClick={() => setShowPassword((prev) => !prev)}
									aria-pressed={showPassword}
									className={`text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white py-1.5 px-2 rounded-full cursor-pointer ${PRESS} ${FOCUS}`}
								>
									{showPassword ? "Hide" : "Show"}
								</button>
							)}
						</Input>
					)}

				</div>
			</div>

			{/*
				we dont have a guest state rn so no back button yet
				<button 
                    type="button" 
                    onClick={onBackToChat} 
                    className="w-full text-center text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 pb-4 transition-colors cursor-pointer"
                >
					Back
				</button>
			*/}
		</div>
	);
}