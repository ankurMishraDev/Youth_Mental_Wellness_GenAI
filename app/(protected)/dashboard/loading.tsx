export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8 bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
        <p className="text-orange-600 dark:text-orange-400">Loading dashboard...</p>
      </div>
    </div>
  );
}
