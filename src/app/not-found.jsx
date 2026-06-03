import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="bg-foreground/5 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl font-bold text-brand mb-4">404</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Page Not Found
        </h2>
        <p className="text-foreground/50 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-brand text-white rounded-lg hover:opacity-90 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
