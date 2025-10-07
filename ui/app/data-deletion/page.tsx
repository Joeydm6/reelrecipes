import { NavigationHeader } from "@/components/navigation-header"

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Gegevensverwijdering</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}
        </p>

        <div className="prose prose-neutral mt-6 max-w-none">
          <h2>Account en gegevens verwijderen</h2>
          <p>
            Je kunt op ieder moment verzoeken om verwijdering van je account en alle bijbehorende gegevens
            (zoals recepten). Volg onderstaande stappen:
          </p>
          <ol>
            <li>Stuur een e-mail naar <a href="mailto:support@reelrecipes.app">support@reelrecipes.app</a> vanaf het e-mailadres dat gekoppeld is aan je account.</li>
            <li>Vermeld dat je je account wilt verwijderen en voeg optioneel je gebruikersnaam toe.</li>
            <li>We bevestigen ontvangst en verwijderen je gegevens binnen 30 dagen.</li>
          </ol>

          <h2>In-app verwijdering</h2>
          <p>
            Je kunt individuele recepten verwijderen vanuit de detailpagina van een recept via de knop "Verwijderen".
            Voor volledige accountverwijdering gebruik je het e-mailproces hierboven.
          </p>

          <h2>Wat wordt verwijderd?</h2>
          <ul>
            <li>Je accountgegevens (e-mail en profielinformatie).</li>
            <li>Alle door jou aangemaakte recepten en gerelateerde gegevens.</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Voor vragen over gegevensverwijdering kun je mailen naar <a href="mailto:support@reelrecipes.app">support@reelrecipes.app</a>.
          </p>
        </div>
      </div>
    </div>
  )
}