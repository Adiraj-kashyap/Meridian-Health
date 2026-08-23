export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <span className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-pine-700">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
