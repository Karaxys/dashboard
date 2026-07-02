import {
  Radar,
  Database,
  ShieldAlert,
  Activity,
  Boxes,
  GitBranch,
  FileText,
  BookOpen,
  Newspaper,
  History,
  Building2,
  Lock,
  Mail,
  Eye,
  ServerCog,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  description: string
  icon: LucideIcon
}

export interface NavMenu {
  label: string
  items: NavItem[]
}

export const navMenus: NavMenu[] = [
  {
    label: "Products",
    items: [
      { label: "API Discovery", href: "#platform", description: "Find every API from live traffic", icon: Radar },
      { label: "Data Classification", href: "#platform", description: "Detect PII, secrets & tokens", icon: Database },
      { label: "Active Testing", href: "#platform", description: "BOLA, BFLA & broken auth checks", icon: ShieldAlert },
      { label: "Risk Engine", href: "#platform", description: "Score endpoints by exposure", icon: Activity },
      { label: "eBPF Capture Agent", href: "#workflow", description: "Kernel-level, zero-instrumentation", icon: ServerCog },
    ],
  },
  {
    label: "Solutions",
    items: [
      { label: "Shadow API Discovery", href: "#use-cases", description: "Surface unknown endpoints", icon: Eye },
      { label: "Pre-release Gates", href: "#use-cases", description: "Block risky APIs before ship", icon: GitBranch },
      { label: "Data Governance", href: "#use-cases", description: "Prove PII exposure with evidence", icon: Database },
      { label: "Container & K8s", href: "#platform", description: "Workload-aware traffic capture", icon: Boxes },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Blog", href: "/blog", description: "Research & product updates", icon: Newspaper },
      { label: "Resource Library", href: "/docs", description: "Guides, briefs & datasheets", icon: BookOpen },
      { label: "Documentation", href: "/docs", description: "Set up and operate Karaxys", icon: FileText },
      { label: "Changelog", href: "/docs#changelog", description: "What shipped recently", icon: History },
    ],
  },
  {
    label: "About",
    items: [
      { label: "About", href: "/resources#about", description: "What Karaxys is built for", icon: Building2 },
      { label: "Security", href: "#security", description: "How your data is protected", icon: Lock },
      { label: "Contact", href: "/resources#contact", description: "Get in touch", icon: Mail },
    ],
  },
]
