export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} メドエビデンス. All rights reserved.
      </div>
    </footer>
  );
}
