import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  id?: string;
  required?: boolean;
  className?: string;
  children: (ids: { id: string; ariaDescribedBy?: string }) => React.ReactNode;
}

export function Field({ label, hint, error, id: customId, required, className, children }: FieldProps) {
  const generatedId = useId();
  const id = customId || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const ariaDescribedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">
          {label}
          {required && <span className="text-brick ml-1" title="Required">*</span>}
        </label>
      )}
      {children({ id, ariaDescribedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-sage-deep">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-brick">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "block w-full rounded-md border bg-paper-raised px-3 py-1.5 text-sm text-ink placeholder:text-sage-deep/80 transition-colors duration-150",
        error
          ? "border-brick focus:border-brick focus:ring-1 focus:ring-brick"
          : "border-hairline hover:border-hairline-strong focus:border-ink focus:ring-1 focus:ring-ink",
        className
      )}
      {...props}
    />
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, rows = 3, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "block w-full rounded-md border bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-sage-deep/80 transition-colors duration-150 resize-y",
        error
          ? "border-brick focus:border-brick focus:ring-1 focus:ring-brick"
          : "border-hairline hover:border-hairline-strong focus:border-ink focus:ring-1 focus:ring-ink",
        className
      )}
      {...props}
    />
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "block w-full rounded-md border bg-paper-raised px-3 py-1.5 text-sm text-ink transition-colors duration-150 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%236F7366%22%20d%3D%22M1.4%200L6%204.6%2010.6%200%2012%201.4l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_6px] bg-[right_12px_center] bg-no-repeat pr-8",
        error
          ? "border-brick focus:border-brick focus:ring-1 focus:ring-brick"
          : "border-hairline hover:border-hairline-strong focus:border-ink focus:ring-1 focus:ring-ink",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  hint?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, className, id: customId, ...props },
  ref
) {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded-sm border-hairline-strong text-ink accent-ink focus:ring-2 focus:ring-ink focus:ring-offset-1 cursor-pointer shrink-0"
        {...props}
      />
      {(label || hint) && (
        <div className="text-sm">
          {label && (
            <label htmlFor={id} className="font-normal text-ink cursor-pointer select-none">
              {label}
            </label>
          )}
          {hint && <p className="text-xs text-sage-deep">{hint}</p>}
        </div>
      )}
    </div>
  );
});

