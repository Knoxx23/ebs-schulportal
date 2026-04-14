import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Datenschutzerklärung</h1>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Verantwortliche Stelle</h2>
            <p className="text-gray-700 mb-4">
              Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg text-gray-700">
              <p className="font-semibold mb-2">Muster-Grundschule (Bitte im Code anpassen)</p>
              <p>Musterstraße 1, 12345 Musterstadt</p>
              <p>Email: info@muster-grundschule.de</p>
              <p className="mt-3"><strong>Datenschutzbeauftragter:</strong> datenschutz@muster-grundschule.de</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Rechtsgrundlage der Datenverarbeitung</h2>
            <p className="text-gray-700 mb-4">
              Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage von <strong>Art. 6 Abs. 1 lit. c DSGVO</strong> (Erfüllung einer rechtlichen Verpflichtung) in Verbindung mit den Bestimmungen des Schulgesetzes. Die Datenverarbeitung ist zur Durchführung des Einschulungsprozesses rechtlich erforderlich.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Kategorien verarbeiteter personenbezogener Daten</h2>
            <p className="text-gray-700 mb-4">Wir verarbeiten die folgenden Kategorien personenbezogener Daten:</p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Angaben zum Kind:</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Name (Vor- und Nachname)</li>
              <li>Geburtsdatum und Geburtsort</li>
              <li>Geschlecht</li>
              <li>Staatsangehörigkeit</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Angaben zu den Eltern/Erziehungsberechtigten:</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Name</li>
              <li>Wohn- und Postadresse</li>
              <li>Telefonnummer</li>
              <li>Email-Adresse</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Schulische Angaben:</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Kindergarten/vorherige Schule</li>
              <li>Einschulungsjahr und -datum</li>
              <li>Schulweg und zukünftige Schulform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Zweck der Datenverarbeitung</h2>
            <p className="text-gray-700 mb-4">Die personenbezogenen Daten werden ausschließlich für folgende Zwecke verarbeitet:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Durchführung des Einschulungsprozesses</li>
              <li>Erfüllung schulischer Aufgaben und Verwaltung</li>
              <li>Kommunikation mit Eltern/Erziehungsberechtigten</li>
              <li>Dokumentation schulischer Vorgänge</li>
              <li>Erfüllung gesetzlicher Aufbewahrungspflichten</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Speicherdauer</h2>
            <p className="text-gray-700 mb-4">
              Ihre personenbezogenen Daten werden in der Regel für den Zeitraum der Schulzugehörigkeit sowie darüber hinaus bis zu <strong>10 Jahren</strong> gespeichert, um gesetzliche Aufbewahrungspflichten zu erfüllen. Nach Ablauf dieser Frist werden die Daten gelöscht, sofern keine anderen gesetzlichen Aufbewahrungspflichten bestehen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Empfänger von Daten</h2>
            <p className="text-gray-700 mb-4">
              Ihre Daten werden nur an Personen weitergegeben, die zur Erfüllung schulischer Aufgaben befugt sind. Dies sind insbesondere:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Lehrkräfte und pädagogisches Schulpersonal</li>
              <li>Schulleitung und Schulverwaltung</li>
              <li>Schulaufsichtsbehörden (sofern erforderlich)</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Eine Weitergabe an Dritte erfolgt nicht, sofern nicht rechtlich erforderlich.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Ihre Rechte als betroffene Person</h2>
            <p className="text-gray-700 mb-4">
              Nach der DSGVO haben Sie folgende Rechte:
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Auskunftsrecht (Art. 15 DSGVO)</h3>
            <p className="text-gray-700 mb-4">
              Sie haben das Recht, Auskunft über die zu Ihrer Person gespeicherten Daten zu erhalten. Sie können jederzeit eine Kopie Ihrer Daten anfordern.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Berichtigungsrecht (Art. 16 DSGVO)</h3>
            <p className="text-gray-700 mb-4">
              Sie können die Berichtigung unrichtiger oder unvollständiger personenbezogener Daten verlangen.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Löschungsrecht (Art. 17 DSGVO)</h3>
            <p className="text-gray-700 mb-4">
              Unter bestimmten Voraussetzungen haben Sie das Recht, die Löschung Ihrer personenbezogenen Daten zu verlangen (z.B. wenn die Daten nicht mehr notwendig sind).
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Recht auf Einschränkung (Art. 18 DSGVO)</h3>
            <p className="text-gray-700 mb-4">
              Sie können die Einschränkung der Verarbeitung verlangen, z.B. wenn Sie die Richtigkeit Ihrer Daten bestreiten.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</h3>
            <p className="text-gray-700 mb-4">
              Sie haben das Recht, Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten und diese an einen anderen Verantwortlichen zu übermitteln.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Widerspruchsrecht (Art. 21 DSGVO)</h3>
            <p className="text-gray-700 mb-4">
              Sie haben das Recht, Widerspruch gegen die Verarbeitung Ihrer personenbezogenen Daten einzulegen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Kontaktmöglichkeiten</h2>
            <p className="text-gray-700 mb-4">
              Zur Geltendmachung Ihrer Rechte oder bei Fragen zum Datenschutz kontaktieren Sie bitte:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg text-gray-700">
              <p className="font-semibold mb-2">Muster-Grundschule (Bitte im Code anpassen)</p>
              <p>Musterstraße 1, 12345 Musterstadt</p>
              <p>Tel: 01234 / 56789</p>
              <p>Email: info@muster-grundschule.de</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Beschwerderecht</h2>
            <p className="text-gray-700">
              Sie haben das Recht, sich bei einer Datenschutzbehörde zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen die DSGVO verstößt. Die zuständige Datenschutzbehörde finden Sie auf der Website Ihres Bundeslandes.
            </p>
          </section>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
            <p className="text-sm text-gray-700">
              <strong>Stand:</strong> April 2026. Diese Datenschutzerklärung wird regelmäßig überprüft und angepasst.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
