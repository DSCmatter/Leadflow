"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Reusable accessible dialog built on the shadcn/Watermelon-UI dialog
 * primitives (Base UI). Escape, backdrop click, and focus management are
 * handled by the primitive; closing notifies the parent via `onClose`.
 */
export function Modal({
  title,
  onClose,
  children,
  widthClass = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-ink/60 backdrop-blur-[2px]" />
        <DialogPrimitive.Popup
          role="dialog"
          aria-modal="true"
          className={`fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100%-2rem)] w-full ${widthClass} -translate-x-1/2 -translate-y-1/2 gap-0 overflow-y-auto rounded-lg border border-ink bg-cream text-ink shadow-[6px_6px_0_rgba(28,24,19,0.85)] outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95`}
        >
          <div className="flex items-center justify-between border-b-2 border-ink px-6 py-4">
            <DialogTitle className="font-display text-[24px] tracking-tight text-ink">
              {title}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md border border-transparent p-1 text-ink/50 transition hover:border-ink hover:bg-volt hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
