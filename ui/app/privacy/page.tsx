import { NavigationHeader } from "@/components/navigation-header"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Privacybeleid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}
        </p>

        <div className="prose prose-neutral mt-6 max-w-none">
          <h2>Overzicht</h2>
          <p>
            ReelRecipes respecteert jouw privacy. Dit document legt uit welke gegevens we verzamelen,
            waarom we die gegevens gebruiken en welke rechten jij hebt.
          </p>

          <h2>Welke gegevens verzamelen we?</h2>
          <ul>
            <li><strong>Accountgegevens</strong>: e-mailadres en basisprofiel via Supabase-authenticatie.</li>
            <li><strong>App-gegevens</strong>: recepten die je aanmaakt of bewerkt (titel, ingrediënten, stappen, tags).</li>
            <li><strong>Technische logs</strong>: beperkte fout- en prestatieregistraties om de app te verbeteren.</li>
          </ul>

          <h2>Hoe gebruiken we jouw gegevens?</h2>
          <ul>
            <li>Om je account te beheren en toegang te bieden tot je recepten.</li>
            <li>Om recepten op te slaan, te bewerken en weer te geven in de app.</li>
            <li>Om foutmeldingen te onderzoeken en de stabiliteit/veiligheid van de app te verbeteren.</li>
          </ul>

          <h2>Delen we gegevens met derden?</h2>
          <p>
            We delen geen persoonsgegevens met derden voor marketingdoeleinden. Voor functionaliteit maken we gebruik van:
          </p>
          <ul>
            <li><strong>Supabase</strong> voor authenticatie en databaseopslag.</li>
            <li><strong>Instagram/Meta oEmbed</strong> om publieke post-informatie (caption/thumbnail) op te halen wanneer geconfigureerd.</li>
          </ul>
          <p>
            Deze partijen verwerken gegevens conform hun eigen privacyvoorwaarden.
          </p>

          <h2>Bewaartermijn</h2>
          <p>
            We bewaren gegevens zolang je een actief account hebt. Op jouw verzoek verwijderen we jouw account en bijbehorende gegevens.
          </p>

          <h2>Beveiliging</h2>
          <p>
            We nemen redelijke maatregelen om gegevens te beschermen. Geen enkel systeem is volledig veilig; meld kwetsbaarheden a.u.b. via ons contactadres.
          </p>

          <h2>Jouw rechten</h2>
          <ul>
            <li>Inzage in je gegevens.</li>
            <li>Correctie van onjuiste gegevens.</li>
            <li>Verwijdering van je gegevens (zie ook Gegevensverwijdering).</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Vragen of verzoeken? Mail ons op <a href="mailto:support@reelrecipes.app">support@reelrecipes.app</a>.
          </p>

          <h2>Wijzigingen</h2>
          <p>
            We kunnen dit beleid aanpassen. Relevante wijzigingen worden in de app gepubliceerd.
          </p>
        </div>
      </div>
    </div>
  )
}