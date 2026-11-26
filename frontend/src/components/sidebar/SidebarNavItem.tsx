import type { ReactNode } from 'react';
import { Button } from '../buttons/Button';


interface SidebarNavItemProps {
	label: string;
	active: boolean;
	onClick?: () => void;
	disabled?: boolean;
	icon?: ReactNode;
}

export function SidebarNavItem({ label, active, onClick, disabled, icon }: SidebarNavItemProps) {
	return (
		<Button onClick={onClick} active={active} disabled={disabled}>
			<span className="flex items-center gap-3">
				{icon}
				<span>{label}</span>
			</span>
		</Button>
	);
}