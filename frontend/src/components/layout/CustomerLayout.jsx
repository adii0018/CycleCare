export function CustomerLayout({ children }) {
  return (
    <div className="min-h-[100dvh] bg-brand-bg flex flex-col justify-between">
      <main className="w-full max-w-[480px] mx-auto px-4 py-6 sm:py-8 flex-1 flex flex-col justify-center">
        {children}
      </main>
      <footer className="w-full text-center py-4 text-xs text-brand-muted">
        <p>&copy; {new Date().getFullYear()} Rajput Auto Garage. All rights reserved.</p>
      </footer>
    </div>
  );
}
