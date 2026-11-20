import { Button } from './Button';

export function TwoOptionButton( { onOption1, onOption2, option1Text = "OPTION 1", option2Text = "OPTION 2" } ) {
    return (
        <div className="flex flex-row gap-3 w-full">
            <Button onClick={onOption1} className="flex-1 justify-center">
                {option1Text}
            </Button>
            <Button onClick={onOption2} className="flex-1 justify-center">
                {option2Text}
            </Button>
        </div>
    );
}