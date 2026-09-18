import { HugeiconsIcon } from "@hugeicons/react";
import { UserRemove01Icon } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestName: string;
  eventTitle: string;
  onConfirm: () => void;
}

/**
 * Guards the destructive "remove guest" action from an accidental tap.
 * Wire this up wherever GuestRow's onRemove fires, instead of removing
 * immediately.
 */
export function ConfirmRemoveDialog({
  open,
  onOpenChange,
  guestName,
  eventTitle,
  onConfirm,
}: ConfirmRemoveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[280px] rounded-2xl text-center font-body">
        <DialogHeader className="items-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-joyna-red/10">
            <HugeiconsIcon icon={UserRemove01Icon} className="h-5 w-5 text-joyna-red" strokeWidth={2} />
          </div>
          <DialogTitle className="font-display text-[15px]">Remove {guestName}?</DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed">
            They&rsquo;ll be uninvited from {eventTitle} and won&rsquo;t be notified until they
            check the event again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Remove guest
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
