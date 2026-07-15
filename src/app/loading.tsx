/** Accessible root loading state for streamed route transitions. */
export default function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status">
      <span className="size-8 animate-spin rounded-full border-2 border-border border-t-gold" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
