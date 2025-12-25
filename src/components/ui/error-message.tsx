import { AlertCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  className?: string;
}

export function ErrorMessage({ title = "Error", message, className }: ErrorMessageProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

interface FieldErrorProps {
  message?: string;
  className?: string;
}

export function FieldError({ message, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p className={cn("text-sm font-medium text-destructive", className)} role="alert">
      {message}
    </p>
  );
}

interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
  className?: string;
}

export function ErrorFallback({ error, resetError, className }: ErrorFallbackProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-8",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 text-destructive">
        <XCircle className="h-8 w-8" aria-hidden="true" />
        <h2 className="text-2xl font-bold">Something went wrong</h2>
      </div>
      <p className="text-center text-muted-foreground max-w-md">
        {error.message || "An unexpected error occurred. Please try again later."}
      </p>
      {resetError && (
        <button
          onClick={resetError}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          type="button"
        >
          Try again
        </button>
      )}
    </div>
  );
}
