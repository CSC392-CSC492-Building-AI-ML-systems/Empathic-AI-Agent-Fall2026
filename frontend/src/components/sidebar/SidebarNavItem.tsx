import { Button } from '../buttons/Button';
import { PlusIcon } from '../buttons/Icons';


interface SidebarNavItemProps {
	label: string;
	active: boolean;
	onClick?: () => void;
	disabled?: boolean;
}

export function SidebarNavItem({ label, active, onClick, disabled }: SidebarNavItemProps) {
	return (
		<Button onClick={onClick} active={active}>
		<PlusIcon />
		<span>{label}</span>
		</Button>
	);
}