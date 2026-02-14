import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">NYC Coffee</h1>
        <p className="mb-8 text-lg text-gray-500">
          512 West 43rd Street, New York, NY
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/customer"
            className="rounded-lg bg-gray-900 px-8 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Place an Order
          </Link>
          <Link
            href="/barista"
            className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Barista Queue
          </Link>
          <Link
            href="/owner"
            className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Owner Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
