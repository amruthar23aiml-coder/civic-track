import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  /** Optional preview rendered inside the dialog, e.g. the photo being deleted. */
  preview?: ReactNode;
  trigger?: ReactNode;
};

export function ConfirmDelete({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  disabled,
  preview,
  trigger,
}: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="destructive" size="sm" disabled={disabled}>
            <Trash2 className="size-4" /> Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ? `${description} ` : ""}This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {preview && <div className="rounded-xl border border-border p-2">{preview}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
