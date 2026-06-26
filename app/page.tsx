import { LandingNavbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { Stats } from "@/components/landing/stats"
import {
  FeatureDetect,
  FeatureInventory,
  Security,
  Workflow,
  CallToAction,
} from "@/components/landing/sections"
import { Integrations } from "@/components/landing/integrations"
import { LandingFooter } from "@/components/landing/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNavbar />
      <main>
        <Hero />
        <FeatureDetect />
        <FeatureInventory />
        <Stats />
        <Workflow />
        <Integrations />
        <Security />
        <CallToAction />
      </main>
      <LandingFooter />
    </div>
  )
}
