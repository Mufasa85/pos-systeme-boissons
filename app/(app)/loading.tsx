export default function AppLoading() {
  return (
    <div className="flex h-[calc(100vh-2rem)] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-[var(--brand)]" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    </div>
  );
}
