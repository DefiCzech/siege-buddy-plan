import { useRef, useState, useCallback, useEffect } from "react";

interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function useConfirmDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
  const [open, setOpen] = useState(false);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const handleDialogClose = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setOpen(false);
  }, []);

  const confirmDialogElement = (
    <dialog
      ref={dialogRef}
      className="rounded-lg border border-border bg-card text-foreground p-0 backdrop:bg-black/50 max-w-sm w-full"
      onClose={handleDialogClose}
    >
      <div className="p-5 space-y-4">
        <p className="text-sm font-mono">{options.message}</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs font-mono rounded border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {options.cancelLabel || "Zrušit"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-3 py-1.5 text-xs font-mono rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            {options.confirmLabel || "Odebrat"}
          </button>
        </div>
      </div>
    </dialog>
  );

  return { confirm, ConfirmDialog: confirmDialogElement };
}
