import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ImprintPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <article className="prose prose-sm sm:prose lg:prose-lg max-w-none">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Impressum</h1>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Angaben gemäß § 5 Telemediengesetz (TMG)</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Schulname</h3>
                <p className="text-gray-700 bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <em>[bitte ausfüllen]</em>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Anschrift</h3>
                <p className="text-gray-700 bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <em>[bitte ausfüllen]</em>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Vertretungsberechtigt</h3>
                <p className="text-gray-700 mb-2">
                  Vertreten durch die Schulleitung:
                </p>
                <p className="text-gray-700 bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <em>[bitte ausfüllen]</em>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Kontakt</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Telefon:</strong>
                  <br />
                  <span className="bg-yellow-50 border border-yellow-200 p-2 rounded inline-block mt-1">
                    <em>[bitte ausfüllen]</em>
                  </span>
                </p>
                <p className="text-gray-700 mt-3">
                  <strong>Email:</strong>
                  <br />
                  <span className="bg-yellow-50 border border-yellow-200 p-2 rounded inline-block mt-1">
                    <em>[bitte ausfüllen]</em>
                  </span>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Aufsichtsbehörde</h3>
                <p className="text-gray-700 bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <em>[bitte ausfüllen]</em>
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Haftungsausschluss</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Haftung für Inhalte</h3>
            <p className="text-gray-700 mb-4">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 Telemediengesetz (TMG) für eigene Inhalte verantwortlich. Die Verantwortung für fremde Inhalte wird wirksam, sobald wir von einer Rechtsverletzung Kenntnis erlangen.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Haftung für Links</h3>
            <p className="text-gray-700 mb-4">
              Unsere Website enthält Links zu externen Websites. Für die Inhalte der verlinkten Seiten sind die jeweiligen Betreiber verantwortlich. Wir haben die verlinkten Seiten zum Zeitpunkt der Verlinkung auf Rechtsverletzungen überprüft. Sollten wir Kenntnis von einer Rechtsverletzung erlangen, werden wir die betreffenden Links unverzüglich entfernen.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Urheberrecht</h3>
            <p className="text-gray-700 mb-4">
              Die auf dieser Website verwendeten Inhalte unterliegen dem deutschen Urheberrecht. Eine Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des Autors oder Urhebers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Technische Informationen</h2>
            <p className="text-gray-700 mb-4">
              Das Einschulungsblatt-Portalsystem wird bereitgestellt und betrieben durch das schulische IT-System. Für technische Fragen wenden Sie sich bitte an die Schulverwaltung.
            </p>
          </section>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
            <p className="text-sm text-gray-700">
              <strong>Stand:</strong> April 2026
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
