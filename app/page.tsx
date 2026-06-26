import { LandingNavbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Logos } from "@/components/landing/logos"
import { Stats } from "@/components/landing/stats"
import {
  Capabilities,
  Workflow,
  UseCases,
  Security,
  CallToAction,
} from "@/components/landing/sections"
import { Integrations } from "@/components/landing/integrations"
import { Resources } from "@/components/landing/resources"
import { LandingFooter } from "@/components/landing/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <Hero />
        <Logos />
        <Capabilities />
        <Stats />
        <Workflow />
        <UseCases />
        <Integrations />
        <Security />
        <Resources />
        <CallToAction />
      </main>
      <LandingFooter />
    </div>
  )
}
