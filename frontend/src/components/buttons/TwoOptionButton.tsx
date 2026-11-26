import { Button } from './Button';

interface TwoOptionButtonProps {
	onOption1: () => void;
	onOption2: () => void;
	option1Text?: string;
	option2Text?: string;
	disabled?: boolean;
}

export function TwoOptionButton( { onOption1, onOption2, option1Text = "OPTION 1", option2Text = "OPTION 2", disabled }: TwoOptionButtonProps ) {
    return (
        <div className="flex flex-row gap-3 w-full">
            <Button onClick={onOption1} className="flex-1 justify-center" disabled={disabled}>

                {option1Text}
            </Button>
            <Button onClick={onOption2} className="flex-1 justify-center" disabled={disabled}>
                {option2Text}
            </Button>
        </div>
    );
}