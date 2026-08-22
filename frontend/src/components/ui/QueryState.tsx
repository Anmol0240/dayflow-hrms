import { Alert } from "./Alert";
import { Button } from "./Button";
import { LoadingState } from "./LoadingState";

export function QueryState({
  isLoading,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (isLoading) return <LoadingState label="Loading Dayflow data" />;
  if (error)
    return (
      <Alert>
        <p className="font-medium">We couldn’t load this information.</p>
        <p className="mt-1">{error instanceof Error ? error.message : "Please try again."}</p>
        {onRetry ? (
          <Button className="mt-3" onClick={onRetry} size="sm" variant="secondary">
            Try again
          </Button>
        ) : null}
      </Alert>
    );
  return children;
}
