import { Button } from '../buttons/Button';
import { PlusIcon } from '../buttons/Icons';

export function SidebarNavItem({ label, active, onClick }) {
	return (
		<Button onClick={onClick} active={active}>
		<PlusIcon />
		<span>{label}</span>
		</Button>
	);
}