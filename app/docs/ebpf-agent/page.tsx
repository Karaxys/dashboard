import type { Metadata } from "next"
import { DocPage, DocLede, H2, H3, P, Strong, CodeBlock, UL, LI, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "eBPF capture agent — Karaxys Docs",
  description: "How Karaxys captures API traffic at the Linux kernel with eBPF — including TLS, HTTP/2, and high-throughput delivery.",
}

export default function EbpfPage() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Traffic capture"
        title="eBPF capture agent"
        description="The capture agent is how Karaxys sees your API traffic. It runs an eBPF program inside the Linux kernel to observe API conversations from any process on a host — including encrypted TLS — with no SDKs, no proxies, and no application changes."
      />

      <H2>Why eBPF</H2>
      <P>
        eBPF lets Karaxys run sandboxed programs inside the Linux kernel, attached to the exact points
        where applications send and receive data. Capturing there has decisive advantages over the
        alternatives:
      </P>
      <DocTable
        head={["Approach", "Trade-off"]}
        rows={[
          [<Strong key="1">Language SDKs</Strong>, "Require code changes in every service and only cover the languages you instrument."],
          [<Strong key="2">Sidecar proxies</Strong>, "Force traffic through a new network hop and miss anything that does not route through them."],
          [<Strong key="3">eBPF capture</Strong>, "Sees traffic from every process on the host with no instrumentation and negligible overhead — nothing to bypass."],
        ]}
      />

      <H2>How it works</H2>
      <P>
        The agent has two halves that work together: a small program that runs in the kernel, and a
        userspace process that assembles what the kernel observes into complete API conversations.
      </P>

      <H3>Kernel-space program</H3>
      <P>
        The eBPF program attaches to the kernel functions that carry socket I/O — the read and write paths
        used by every networked process. For each relevant call it records the socket, the direction, and a
        bounded copy of the payload, then hands that off to userspace. Because it attaches at the socket
        layer, it is agnostic to language, framework, and process.
      </P>
      <Callout type="info" title="Safety by construction">
        eBPF programs are verified by the kernel before they load: the verifier proves the program always
        terminates and only accesses memory within proven bounds. Karaxys&apos;s program is written to pass
        this verification on production kernels, which is what makes in-kernel capture safe to run on live
        systems.
      </Callout>

      <H3>Userspace assembler</H3>
      <P>
        Raw socket events arrive out of order, split across many calls, and interleaved between concurrent
        connections. The userspace assembler stitches them back together — tracking each connection,
        ordering its segments, joining chunked payloads, and reconstructing the full request and response —
        until it has a complete <Strong>conversation</Strong> ready to ship.
      </P>

      <H3>Lifecycle of one captured request</H3>
      <P>
        Following a single API call from the wire to the backend shows how the two halves cooperate:
      </P>
      <CodeBlock title="capture lifecycle">
{`1. app calls write()/SSL_write()   ── plaintext, before encryption
        │  eBPF probe fires
        ▼
2. kernel records {socket, direction, bounded payload slice}
        │  published to a per-CPU ring buffer
        ▼
3. userspace assembler drains the ring buffer
        │  groups events by connection, orders segments
        ▼
4. reassemble request … then the matching response
        │  join chunked bodies, demux HTTP/2 streams
        ▼
5. complete conversation  { method, path, headers, bodies, status }
        │  enrich with container / workload identity
        ▼
6. ship to backend over authenticated HTTPS`}
      </CodeBlock>
      <P>
        The key idea is that the kernel side stays deliberately dumb and fast — it copies bounded slices and
        moves on — while all the stateful, expensive reconstruction happens in userspace where it can be
        restarted and scaled without touching the kernel program.
      </P>

      <H2>TLS visibility</H2>
      <P>
        Most API traffic is encrypted, so capturing only at the socket layer would yield ciphertext. To see
        inside TLS, the agent additionally attaches to the well-known entry points of common TLS libraries —
        the functions applications call to read and write plaintext just before it is encrypted and just
        after it is decrypted.
      </P>
      <P>
        This gives Karaxys the cleartext request and response <Strong>without terminating TLS, holding
        private keys, or acting as a man in the middle</Strong>. The data is read from the same process that
        already legitimately holds it, at the boundary where the application itself works with plaintext.
      </P>
      <Callout type="security" title="No keys, no interception">
        Karaxys never decrypts traffic in flight and never handles your TLS private keys. It observes
        plaintext only at the point where the owning application produces or consumes it.
      </Callout>

      <H2>Protocol support</H2>
      <P>
        The assembler understands the protocols APIs actually use in production:
      </P>
      <DocTable
        head={["Protocol", "Support"]}
        rows={[
          [<Strong key="1">HTTP/1.1</Strong>, "Full request/response reconstruction, including chunked transfer encoding and keep-alive connection reuse."],
          [<Strong key="2">HTTP/2</Strong>, "Frame-aware parsing that demultiplexes concurrent streams over a single connection and reassembles each request and response."],
          [<Strong key="3">HTTP/3 (QUIC)</Strong>, "Not captured. QUIC runs over UDP with its own in-userspace encryption and is out of scope for kernel socket capture."],
        ]}
      />

      <H2>Built for throughput</H2>
      <P>
        On a busy host the kernel can emit socket events faster than any single consumer can drain them. The
        agent is engineered so capture keeps up under load rather than dropping data:
      </P>
      <DocTable
        head={["Technique", "Why it matters"]}
        rows={[
          [<Strong key="1">Sharded ring buffers</Strong>, "Events are spread across multiple per-CPU ring buffers, so many cores can publish in parallel without contending on one queue."],
          [<Strong key="2">Bounded payload copies</Strong>, "The kernel copies only a bounded slice of each payload, keeping per-event work small and predictable."],
          [<Strong key="3">Payload chunking & spill</Strong>, "Large bodies are chunked and, when necessary, spilled to local storage so a big response never stalls the hot path."],
          [<Strong key="4">Payload classification</Strong>, "A fast pre-filter keeps API traffic and discards noise before the expensive assembly step runs."],
        ]}
      />

      <H2>Delivery to the backend</H2>
      <P>
        Once a conversation is assembled, the agent ships it to the backend over an authenticated HTTPS
        endpoint using your account&apos;s scoped ingest token. The backend acknowledges receipt and places
        the conversation on the analysis queue. Delivery is resilient to transient backend unavailability so
        short outages do not lose data.
      </P>

      <H2>Deployment model</H2>
      <P>
        The agent is distributed as a container image and is designed to run with the privileges eBPF
        requires. You point it at your account&apos;s ingest endpoint with the token from the Quick Start
        panel and it begins capturing immediately.
      </P>
      <H3>Scope of capture</H3>
      <UL>
        <LI>
          <Strong>All processes on the host by default.</Strong> The agent captures every process&apos;s API
          traffic; there is nothing to attach per service.
        </LI>
        <LI>
          <Strong>Port exclusions.</Strong> You can exclude specific ports — for example, your own
          backend&apos;s internal traffic — so the inventory reflects only what you care about.
        </LI>
        <LI>
          <Strong>Container and orchestration metadata.</Strong> When running alongside containers, captured
          conversations are enriched with container and workload identity, so endpoints trace back to the
          service that served them.
        </LI>
      </UL>

      <Callout type="warn" title="Linux only">
        Kernel capture depends on Linux and eBPF. The agent runs on Linux hosts; the rest of the platform —
        backend, scanner, and dashboard — runs anywhere.
      </Callout>

      <H2>What the agent does not do</H2>
      <UL>
        <LI>It does not modify, block, or delay traffic — capture is strictly passive and read-only.</LI>
        <LI>It does not terminate TLS or require your private keys.</LI>
        <LI>It does not send raw payloads anywhere except your own backend, over an authenticated channel.</LI>
      </UL>

      <NextSteps
        links={[
          { label: "API inventory", href: "/docs/inventory", desc: "What happens to conversations after capture." },
          { label: "Architecture", href: "/docs/architecture", desc: "Where the agent sits in the pipeline." },
          { label: "Scanner engine", href: "/docs/scanner", desc: "Test the endpoints the agent discovers." },
          { label: "Security & privacy", href: "/docs/security", desc: "How captured data is redacted and retained." },
        ]}
      />
    </DocPage>
  )
}
