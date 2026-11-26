import type { ChangeEvent, SyntheticEvent, ReactNode } from 'react';
import { SendIcon } from './Icons';

interface InputProps {
	value: string;
	onChange: (e: ChangeEvent<HTMLInputElement>) => void;
	onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
	placeholder?: string;
	type?: 'text' | 'password';
	disabled?: boolean;
  submitDisabled?: boolean;
	children?: ReactNode;
  ariaLabel?: string;
  autoComplete?: string;
}

export function Input({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder, 
  type="text", 
  disabled=false, 
  submitDisabled=false, 
  children, 
  ariaLabel, 
  autoComplete 
  }: InputProps) {

  const isSendDisabled = disabled || submitDisabled || !value.trim();

  return (
    <form onSubmit={onSubmit} className="relative flex items-center w-full">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
		aria-label={ariaLabel ?? placeholder}
		autoComplete={autoComplete}
        className={`w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-full py-4 pl-6 ${children ? 'pr-32' : 'pr-16'} text-base text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 shadow-xs transition focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/15 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 disabled:opacity-60`}
      />
      {/* for the optional hide/show */}
      {children && (
        <div className="absolute right-14 flex items-center gap-1">
          {children}
        </div>
      )}

      <button
        type="submit"
        disabled={isSendDisabled}
		aria-label="Send message"
		title="Send"
        className="absolute right-2 w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 text-white dark:bg-indigo-500 hover:opacity-90 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
      >
        <SendIcon />
      </button>
    </form>
  );
}