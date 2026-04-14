import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} Einschulungsblatt-Portal. Alle Rechte vorbehalten.</p>
          <nav className="flex gap-6">
            <Link to="/datenschutz" className="text-primary-600 hover:text-primary-700 underline">
              Datenschutz
            </Link>
            <Link to="/impressum" className="text-primary-600 hover:text-primary-700 underline">
              Impressum
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
