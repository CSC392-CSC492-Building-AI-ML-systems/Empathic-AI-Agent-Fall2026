import { Button } from './Button';

export function YesOrNoButton( { onYes, onNo, yesText = "YES", noText = "NO" } ) {
    return (
        <div className="flex flex-row gap-3 w-full">
            <Button onClick={onYes} className="flex-1 justify-center">
                {yesText}
            </Button>
            <Button onClick={onNo} className="flex-1 justify-center">
                {noText}
            </Button>
        </div>
    );
}