"use client"

import { NavigationHeader } from "@/components/navigation-header"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Laptop, Scale, RotateCcw } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">Instellingen</h1>
            <p className="mt-2 text-muted-foreground">Pas je voorkeuren aan voor ReelRecipes</p>
          </div>

          {/* Settings Cards */}
          <div className="space-y-4">
            {/* Theme */}
            <Card className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">Thema</Label>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Kies tussen licht, donker of systeem thema
                  </p>
                </div>
                <Select defaultValue="system">
                  <SelectTrigger className="w-[140px] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Units */}
            <Card className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">Eenheden</Label>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Metrisch (gram, ml) of Imperial (cups, oz)
                  </p>
                </div>
                <Select defaultValue="metric">
                  <SelectTrigger className="w-[140px] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="imperial">Imperial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Reset */}
            <Card className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="h-5 w-5 text-muted-foreground" />
                    <Label className="text-base font-medium">Reset demo data</Label>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Verwijder alle demo recepten en start opnieuw
                  </p>
                </div>
                <Button variant="outline" className="rounded-full bg-transparent">
                  Reset
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
