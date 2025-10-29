export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading journal...</p>
      </div>
    </div>
  );
}
