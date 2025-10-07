"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import Link from "next/link"

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
}

export function EmptyState({ icon, title, description, actionLabel, onAction, actionHref }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-4xl">{icon}</div>
      <div className="max-w-md space-y-2">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {actionLabel && actionHref && (
        <Button asChild size="lg" className="mt-2 rounded-full">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && !actionHref && onAction && (
        <Button onClick={onAction} size="lg" className="mt-2 rounded-full">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
