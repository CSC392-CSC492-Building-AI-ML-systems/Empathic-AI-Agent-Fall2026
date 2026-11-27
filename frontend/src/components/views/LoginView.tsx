import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { ChatThread } from '../chat/ChatThread';
import { Input } from '../buttons/Input';
import { TwoOptionButton } from '../buttons/TwoOptionButton';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../buttons/Button';

import type { User } from '@supabase/supabase-js';
import type { ChatMessage, ChatSession, LoginStatus, LoginOrSignup } from '../../types/chat';

interface LoginViewProps {
	onLoginSuccess: (userId: string, sessions: ChatSession[], username?: string) => void;
	onBackToChat?: () => void;
}

const GREETING = "Hi, I'm Sam. would you like to login or create an account?";

const AIRMAIL_STRIPE =
	'repeating-linear-gradient(90deg, #7c3528 0px, #7c3528 10px, #f7f1e3 10px, #f7f1e3 16px, #465a45 16px, #465a45 26px, #f7f1e3 26px, #f7f1e3 32px)';

export function LoginView({ onLoginSuccess }: LoginViewProps) {
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

	const [userId, setUserId] = useState('');

	const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isTyping) return;

		const trimmedInput = inputVal.trim();
		if (!trimmedInput) return;

		if (status === 'name') {
			const usernameRegex = /^\w+$/;
			if (!usernameRegex.test(trimmedInput)) {
				setError('Sorry, your username must be one word and should not contain any special characters. Please try again');
				return;
			}
			setError('');
			setPendingName(trimmedInput);

			await userMsg(trimmedInput);
			await agentMsg(`I will call you ${trimmedInput} from now on. Is that okay with you?`);

			setStatus('confirmName');
		} 

        else if (status === 'email') {
			const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
			
            if (!emailRegex.test(trimmedInput)) {
				setError("Sorry, the format of your email is incorrect. Please try again");
				return;
			}

			setError('');
			setEmail(trimmedInput);

			await userMsg(trimmedInput);
			await agentMsg('Thanks for sharing your email with me!');

			if (loginOrSignup === 'login') {
				await agentMsg('Okay :) Please enter in your password so I can help you login');
			}

			if (loginOrSignup === 'signup') {
				await agentMsg('Got it! Now please choose a password that is at least 8 characters');
			}

			setStatus('password');
		} 
        
        else if (status === 'password') {
			if (loginOrSignup === 'signup') {
				if (trimmedInput.length < 8) {
					setError("Your password needs at least 8 characters!");
					return;
				}
				const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;
				if (!passwordRegex.test(trimmedInput)) {
					setError('Try to use at least one uppercase, one lowercase, one number, and one special character!');
					return;
				}

				setError('');
				setShowPassword(false);
				setPassword(trimmedInput);

				setStatus('confirmPassword');
				await agentMsg("Please enter in your password again to double check that you entered it correctly!");
				return;
			}
            // -----------------login------------------------------
			if (loginOrSignup === 'login') {
				if (passwordAttempts + 1 >= 5) {
					await agentMsg("you have tried too many times, disabling and bringing you back to the start now");
					await resetAllFields();
					await agentMsg(GREETING);
					return;
				}

				const loginData = await loginToAccount(trimmedInput);
				if (!loginData || !loginData.user || !loginData.session) {
					setShowPassword(false);
					await agentMsg("Hey, I think you entered the wrong password, or your account doesn't exist. Please try again!");
					setPasswordAttempts(passwordAttempts + 1);
					return;
				}

				const loggedInUserId = loginData.user.id;
				const name = extractUserName(loginData.user);
				setUsername(name);
				setUserId(loggedInUserId);
				onLoginSuccess(loggedInUserId, [], name);

				await agentMsg('Ok :D I have all the info I need now. You are all logged in now!');
				setStatus('done');
				return;
			}
		} 
        else if (status === 'confirmPassword') {
			if (trimmedInput !== password) {
				await agentMsg("Sorry, your passwords don't match. Please try again!");
				await agentMsg("Please choose a password that is at least 8 characters");
				setStatus('password');
				return;
			}

			setPassword(trimmedInput);
            // creating an account using supabase -> will send a verification email to the user
			const signupData = await createAccount(username, email, trimmedInput);

			if (!signupData || !signupData.user) {
				await agentMsg(
					'Hmm, something went wrong creating your account. Please try a different password or try again later.'
				);
				return;
			}

			if (!signupData.session) {
				await agentMsg(
					"I've sent you a verification email! Please check your inbox and click the link to finish creating your account."
				);
				setStatus('awaitingVerification');
				return;
			}

			const newUserId = signupData.user.id;
			const name = extractUserName(signupData.user);
			setUsername(name);
			setUserId(newUserId);
			onLoginSuccess(newUserId, [], name);

			await agentMsg(`Ok :D I have all the info I need now. It was a pleasure to meet you ${username}!`);
			setStatus('done');
			return;
		}
	};

	const isWaitingForConfirmation = status === 'confirmName' || status === 'confirmEmail';
	const isSignupOrLogin = status === '' && !isWaitingForConfirmation;

	const userMsg = async (text: string) => {
		setMessages((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				sender: username !== '' ? username : 'user',
				text,
				timestamp: new Date().toISOString()
			}
		]);
	};

	const agentMsg = async (text: string) => {
		setInputVal('');
		setIsTyping(true);
		await waitOneSecond();
		setIsTyping(false);
		setMessages((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				sender: 'sam',
				text,
				timestamp: new Date().toISOString()
			}
		]);
	};

	const handleConfirmYes = async () => {
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
		if (isTyping) return;

		await userMsg('Log in');
		await agentMsg('Ok :) Please enter your email so I can help you log in.');

		setStatus('email');
		setLoginOrSignup('login');
	};

	const handleSignup = async () => {
		if (isTyping) return;

		await userMsg('Sign up');
		await agentMsg('Ok :) I will help you create an account');
		await agentMsg('To start off, what would you like me to call you?');

		setStatus('name');
		setLoginOrSignup('signup');
	};

	const handleRestart = async () => {
		if (isTyping) return;
		await resetAllFields();
		await agentMsg(GREETING);
	};

    // using supabaset to login to an account -> returns data if successful, null if not
	const loginToAccount = async (pwd: string) => {
		try {
			const { data, error: authError } = await supabase.auth.signInWithPassword({
				email,
				password: pwd
			});

			if (authError) {
				console.error('Login error:', authError.message);
				return null;
			}

			return data;
		} 
        catch (error) {
			console.error('Error logging in:', error);
			return null;
		}
	};

	const createAccount = async (name: string, userEmail: string, pwd: string) => {
		try {
			const { data, error: signUpError } = await supabase.auth.signUp({
				email: userEmail,
				password: pwd,
				options: {
					data: { name },
					emailRedirectTo: 'http://localhost:5173/auth/callback'
				}
			});

			if (signUpError) {
				console.error('error in creating an account:', signUpError.message);
				return null;
			}

			return data;
		} 
        catch (error) {
			console.error('Error creating account:', error);
			return null;
		}
	};

	const extractUserName = (user: User | null | undefined) =>
		user?.user_metadata?.name || user?.user_metadata?.full_name || username || 'User';

	const resetAllFields = async () => {
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
	};



	return (
		<div className="flex min-h-full w-full flex-1 items-center justify-center bg-linear-to-b from-[#f6f1e4] via-[#f2ead8] to-[#ede2ca] px-4 py-8 text-[#2b2118]">
			<div className="relative w-full max-w-2xl">
				{/* Stacked Stationery Back Sheet */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-2 top-2.5 -bottom-2.5 rounded-sm border border-[#d6c8b0] bg-[#efe5d0] shadow-xs"
				/>

				{/* Main Mail Card Container */}
				<section
					aria-label="Sam correspondence sign in"
					className="relative flex max-h-[82vh] flex-col overflow-hidden rounded-sm border border-[#d6c8b0] bg-[#fcf9f2] shadow-[0_14px_34px_rgba(43,33,24,0.12)]"
					style={{
						backgroundImage: `${AIRMAIL_STRIPE}, linear-gradient(#fcf9f2, #fcf9f2)`,
						backgroundSize: '100% 6px, 100% 100%',
						backgroundRepeat: 'no-repeat'
					}}
				>
					{/* Mail Card Header */}
					<header className="flex shrink-0 items-center justify-between gap-4 border-b border-dashed border-[#dfd3be] px-6 pb-4 pt-6 sm:px-7">
						<div className="flex items-center gap-3.5">
							<div
								aria-hidden="true"
								className="flex h-11 w-11 items-center justify-center border border-dashed border-[#b69d7e] bg-[#f4ead7] text-[#6d4634]"
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.75"
									className="h-5 w-5"
								>
									<rect x="3" y="5" width="18" height="14" rx="1.5" />
									<path d="m3.5 6 8.5 7 8.5-7" />
								</svg>
							</div>

							<div>
								<h1 className="font-serif text-lg font-semibold leading-tight text-[#231a12]">
									Sam
								</h1>
								<p className="text-xs text-[#6e5f50]">your new friend...</p>
							</div>
						</div>

						{status !== '' && status !== 'done' ? (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleRestart}
								disabled={isTyping}
								className="text-xs text-gray-500 hover:text-gray-800 font-medium py-1 px-3 rounded-full border border-gray-200 bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Start over
							</Button>
						) : (
							<span className="text-xs text-[#6e5f50]">Get started</span>
						)}
					</header>

					{/* Chat Thread + Action / Input Area */}
					<div className="flex-1 flex flex-col h-full justify-between overflow-hidden">
						<ChatThread messages={messages} isTyping={isTyping} onBranch={undefined} />

						<div className="p-6 max-w-4xl w-full mx-auto">
							{error && (
								<p className="text-red-500 text-xs mb-2 px-1">
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
									option2Variant="primary"
									disabled={isTyping}
								/>
							) : isSignupOrLogin ? (
								<TwoOptionButton
									onOption1={handleSignup}
									onOption2={handleLogin}
									option1Text="Signup"
									option2Text="Login"
									option1Variant="primary"
									option2Variant="primary"
									disabled={isTyping}
								/>
							) : status === 'awaitingVerification' ? (
								<p className="text-center text-sm text-gray-500">
									Please verify your email to continue!
								</p>
							) : status === 'done' ? (
								<p className="text-center text-sm text-gray-500">Completed Login</p>
							) : (
								<div className="relative flex items-center w-full">
									<Input
										value={inputVal}
										onChange={(e) => {
											setInputVal(e.target.value);
											if (error) setError('');
										}}
										onSubmit={handleSubmit}
										placeholder={status === 'password' ? 'Enter your password...' : 'Type your response...'}
										type={(status === 'password' || status === 'confirmPassword') && !showPassword ? 'password' : 'text'}
									>
										{(status === 'password' || status === 'confirmPassword') && (
											<button
												type="button"
												onClick={() => setShowPassword((prev) => !prev)}
												className="text-xs text-gray-500 hover:text-gray-800 font-medium py-1 px-2 focus:outline-none"
											>
												{showPassword ? 'Hide' : 'Show'}
											</button>
										)}
									</Input>
								</div>
							)}
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}