const bcrypt = require('bcryptjs')
const { randomUUID } = require('node:crypto')
const { connectDB, disconnectDB } = require('../config/db')
const User = require('../models/User')
const Post = require('../models/Post')
const Comment = require('../models/Comment')
const Subscriber = require('../models/Subscriber')
const { slugify } = require('../utils/slug')
const { calculateReadingTime } = require('../utils/post')

const authors = [
  { name: 'Priya Raman', email: 'priya@cloudcraftjournal.com', role: 'author' },
  { name: 'Alex Kim', email: 'alex@cloudcraftjournal.com', role: 'author' },
  { name: 'Jordan Mensah', email: 'jordan@cloudcraftjournal.com', role: 'author' },
  { name: 'Maya Chen', email: 'maya@cloudcraftjournal.com', role: 'author' },
  { name: 'Sam Okafor', email: 'sam@cloudcraftjournal.com', role: 'author' },
  { name: 'Elena Rossi', email: 'elena@cloudcraftjournal.com', role: 'author' },
]

const readers = [
  { name: 'Noah Williams', email: 'noah.reader@example.com', role: 'reader' },
  { name: 'Lena Fischer', email: 'lena.reader@example.com', role: 'reader' },
  { name: 'Diego Alvarez', email: 'diego.reader@example.com', role: 'reader' },
  { name: 'Ava Patel', email: 'ava.reader@example.com', role: 'reader' },
  { name: 'Marcus Lee', email: 'marcus.reader@example.com', role: 'reader' },
  { name: 'Sofia Ivanova', email: 'sofia.reader@example.com', role: 'reader' },
]

const subscribers = [
  ['noah.reader@example.com', 'footer'],
  ['lena.reader@example.com', 'homepage'],
  ['diego.reader@example.com', 'article'],
  ['ava.reader@example.com', 'footer'],
  ['devops.daily@example.com', 'homepage'],
  ['platform.notes@example.com', 'article'],
  ['sre.weekly@example.com', 'footer'],
  ['cloud.practitioner@example.com', 'homepage'],
  ['infra.team@example.com', 'article'],
  ['backend.guild@example.com', 'footer'],
  ['justin@example.net', 'homepage'],
  ['maria@example.org', 'article'],
  ['tom@example.com', 'footer'],
  ['anika@example.net', 'homepage'],
  ['ravi@example.org', 'article'],
  ['sofia@example.com', 'footer'],
  ['marcus@example.net', 'homepage'],
  ['helen@example.org', 'article'],
  ['yuki@example.com', 'footer'],
  ['omar@example.net', 'homepage'],
]

const demoPosts = [
  {
    title: 'Zero-downtime deploys on Kubernetes without the guesswork',
    slug: 'zero-downtime-kubernetes',
    category: 'Kubernetes',
    tags: ['kubernetes', 'deployments', 'reliability'],
    authorEmail: 'priya@cloudcraftjournal.com',
    publishedAt: '2026-10-12T09:00:00.000Z',
    views: 4820,
    likes: 6,
    excerpt:
      'Rolling updates, readiness probes, and PodDisruptionBudgets explained through one production-ready deployment.',
    content: `
<p>A rollout is only as safe as the signals in front of it. If the readiness probe returns 200 while the process is still warming caches, Kubernetes will happily send traffic to a pod that cannot serve it. The result is the familiar pattern: a green deployment, a red dashboard, and a rollback that takes longer than the deploy.</p>
<p>This is the checklist we use for stateless services that cannot afford a visible error during a release.</p>
<h2>Make readiness probes tell the truth</h2>
<p>A readiness probe should check the same dependencies the request path needs. It should not check the database with a deep query on every request, but it should fail when the process cannot accept work.</p>
<pre><code>readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 2
  successThreshold: 1
</code></pre>
<p>Keep liveness probes boring. A liveness failure restarts the container, so it should only fire when the process is genuinely stuck. Deep dependency checks belong in readiness, not liveness.</p>
<h2>Budget disruption, not just replicas</h2>
<p>Rolling updates and cluster maintenance both evict pods. A PodDisruptionBudget makes the eviction API wait instead of taking down the last healthy replica.</p>
<pre><code>apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: checkout-api
spec:
  minAvailable: 75%
  selector:
    matchLabels:
      app: checkout-api
</code></pre>
<p>Set maxUnavailable to 0 for latency-sensitive services and let maxSurge do the work. For a three-replica deployment, that means one new pod comes up before an old one is removed.</p>
<h2>The rollout checklist</h2>
<ul>
<li>Readiness covers every dependency on the request path.</li>
<li>At least three replicas are spread across zones.</li>
<li>maxUnavailable is 0 and maxSurge is at least 1.</li>
<li>A PodDisruptionBudget protects maintenance windows.</li>
<li>Dashboards show error rate and latency per revision.</li>
</ul>
<blockquote>A deployment is not finished when the rollout reports success. It is finished when the error rate and latency stay flat for one full traffic cycle.</blockquote>
<p>Run the checklist in staging with production-like traffic. The goal is not to eliminate every risk; it is to make the failure mode obvious before customers find it.</p>
`,
  },
  {
    title: 'A pragmatic Terraform module structure for growing teams',
    slug: 'terraform-module-structure',
    category: 'Terraform',
    tags: ['terraform', 'platform-engineering', 'iac'],
    authorEmail: 'alex@cloudcraftjournal.com',
    publishedAt: '2026-10-08T09:00:00.000Z',
    views: 3910,
    likes: 5,
    excerpt:
      'Stop fighting giant root modules. A folder layout that keeps environments isolated and reusable.',
    content: `
<p>Most Terraform repositories do not fail because the syntax is wrong. They fail because every change has an enormous blast radius. One root module owns networking, identity, clusters, and data stores, so a one-line change triggers a plan with forty resources and a review thread nobody wants.</p>
<h2>One module, one job</h2>
<p>A module should own a single capability with a clear interface. If a module needs six booleans to decide whether it is a network module or a database module, it is probably two modules.</p>
<pre><code>modules/
  network/
  service/
  database/
environments/
  staging/
  production/
</code></pre>
<h2>Keep environment values at the edge</h2>
<p>Environment-specific values belong in root modules, not inside shared modules. The shared module should accept inputs and return outputs; the root module decides which values apply.</p>
<pre><code>module "service" {
  source = "../../modules/service"

  environment = var.environment
  image       = var.image
  replicas    = var.replicas
}
</code></pre>
<h2>Version the interface, not the implementation</h2>
<ul>
<li>Use semantic version tags for modules consumed by other repositories.</li>
<li>Keep provider configuration in the root module.</li>
<li>Expose outputs that other modules actually need, not every internal id.</li>
<li>Document required inputs with examples.</li>
</ul>
<h2>Review for blast radius</h2>
<p>Ask one question in every pull request: if this plan is wrong, what breaks? If the answer includes the production network and the identity provider, split the change. Smaller state files are slower to read, but they make failure recovery much easier.</p>
<blockquote>The best Terraform layout is the one where a new engineer can predict the blast radius of a pull request before opening the plan.</blockquote>
`,
  },
  {
    title: 'Ship faster with a pipeline that fails loudly and early',
    slug: 'ci-cd-fail-fast',
    category: 'CI/CD',
    tags: ['ci-cd', 'github-actions', 'automation'],
    authorEmail: 'jordan@cloudcraftjournal.com',
    publishedAt: '2026-10-03T09:00:00.000Z',
    views: 3675,
    likes: 5,
    excerpt:
      'A layered pipeline strategy that catches cheap problems first and keeps feedback under five minutes.',
    content: `
<p>Fast pipelines are not about buying bigger runners. They are about ordering work so the cheapest checks run first and the expensive ones only see code that already passed.</p>
<h2>Order stages by cost</h2>
<p>A lint job that finishes in seconds should never wait behind an integration suite. Put formatting, type checks, and unit tests in front of builds and environment deploys.</p>
<pre><code>jobs:
  lint:
    steps:
      - run: npm ci
      - run: npm run lint
  test:
    needs: lint
    steps:
      - run: npm test
  build:
    needs: test
    steps:
      - run: npm run build
</code></pre>
<h2>Make caching boring</h2>
<p>Cache keys should be derived from the lockfile. If the key changes on every run, the cache is theater. If it never changes after a dependency update, developers get mysterious failures.</p>
<ul>
<li>Cache package manager downloads, not build output.</li>
<li>Include the lockfile hash in the key.</li>
<li>Restore the cache before installing dependencies.</li>
<li>Do not share caches between unrelated operating systems.</li>
</ul>
<h2>Fail the job, not the developer</h2>
<p>A failing pipeline should say exactly what broke and how to reproduce it locally. Print the command, not just the exit code. Keep credentials scoped to the job that needs them, and never echo secrets into logs.</p>
<blockquote>If a pipeline takes forty minutes, the team will batch changes. Batching changes makes failures larger. The fastest way to improve quality is often to make feedback arrive sooner.</blockquote>
<p>Measure the time from push to first useful failure. That number is the one engineers feel every day.</p>
`,
  },
  {
    title: 'Cutting your AWS bill without a migration',
    slug: 'cutting-aws-bill-without-migration',
    category: 'AWS',
    tags: ['aws', 'cost-optimization', 'finops'],
    authorEmail: 'maya@cloudcraftjournal.com',
    publishedAt: '2026-09-28T09:00:00.000Z',
    views: 3350,
    likes: 4,
    excerpt:
      'A practical sequence for finding waste, right-sizing, and committing only after the baseline is clean.',
    content: `
<p>Cloud bills rarely explode because of one dramatic mistake. They drift: an old load balancer, a forgotten NAT gateway, snapshots nobody expires, and a logging pipeline that grew quietly in the background.</p>
<h2>Find the money before touching architecture</h2>
<p>Start with a service-level view of the last two months. You need the trend, not a single scary total.</p>
<pre><code>aws ce get-cost-and-usage \\
  --time-period Start=2026-09-01,End=2026-10-01 \\
  --granularity MONTHLY \\
  --metrics UnblendedCost \\
  --group-by Type=DIMENSION,Key=SERVICE
</code></pre>
<h2>The four usual suspects</h2>
<ul>
<li>Idle load balancers and unattached volumes.</li>
<li>NAT gateway data processing across availability zones.</li>
<li>Log retention measured in years instead of days.</li>
<li>Over-provisioned instances hidden behind an average CPU graph.</li>
</ul>
<h2>Fix the easy leaks first</h2>
<p>Delete what is unused, right-size what is idle, and move infrequent data to cheaper storage. These changes are reversible and usually pay for themselves before the next architecture review.</p>
<pre><code>aws ec2 describe-volumes \\
  --filters Name=status,Values=available \\
  --query "Volumes[].{Id:VolumeId,Size:Size,Created:CreateTime}"
</code></pre>
<h2>Buy commitments after the cleanup</h2>
<p>Savings plans and reserved capacity are excellent tools once the baseline is stable. Buying them first locks in the waste. Measure a clean month, then commit to the floor, not the peak.</p>
<blockquote>The cheapest instance is the one you deleted. The second cheapest is the one you right-sized. Commitments come after both.</blockquote>
`,
  },
  {
    title: 'Tracing in production with OpenTelemetry',
    slug: 'opentelemetry-tracing-production',
    category: 'Observability',
    tags: ['opentelemetry', 'tracing', 'observability'],
    authorEmail: 'sam@cloudcraftjournal.com',
    publishedAt: '2026-09-23T09:00:00.000Z',
    views: 2980,
    likes: 4,
    excerpt:
      'How to keep distributed traces useful at production volume without turning observability into a second cloud bill.',
    content: `
<p>Adding tracing to a distributed system is easy. Keeping it useful at production volume is the hard part. A trace that costs more than the request it describes is not observability; it is a second bill.</p>
<h2>Start with three decisions</h2>
<ol>
<li>What question should a trace answer in an incident?</li>
<li>Which services must be sampled at 100 percent?</li>
<li>How long does the data need to stay searchable?</li>
</ol>
<h2>A collector config you can grow</h2>
<p>Run the OpenTelemetry Collector close to the workloads so applications only need to know one endpoint. The collector can batch, filter, and route without a redeploy.</p>
<pre><code>receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  otlphttp:
    endpoint: https://otlp.example.com

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
</code></pre>
<h2>Sample for the incident you will have</h2>
<p>Head sampling is cheap but blind. Tail sampling keeps every slow or failed trace and samples the boring ones. The trade-off is memory and a small routing delay. For customer-facing APIs, tail sampling is usually worth it.</p>
<ul>
<li>Keep all errors and traces above the latency SLO.</li>
<li>Sample healthy traces at a low fixed rate.</li>
<li>Add resource attributes that match your deployment labels.</li>
<li>Set retention based on the incident review window.</li>
</ul>
<blockquote>A trace is only useful if an engineer can find the right one during an incident. Optimize for that search, not for the dashboard screenshot.</blockquote>
`,
  },
  {
    title: 'Hardening container images for production',
    slug: 'docker-image-hardening',
    category: 'Docker',
    tags: ['docker', 'containers', 'security'],
    authorEmail: 'elena@cloudcraftjournal.com',
    publishedAt: '2026-09-18T09:00:00.000Z',
    views: 2740,
    likes: 4,
    excerpt:
      'Multi-stage builds, non-root users, and signed images: the small changes that shrink the attack surface.',
    content: `
<p>Most container images contain more than the application. They contain build tools, package caches, shell utilities, and a root user. None of that helps at runtime, and all of it increases the attack surface.</p>
<h2>Start with the smallest useful base</h2>
<p>Use a multi-stage build so compilers and dev dependencies never reach the runtime image. Pin the base image tag and rebuild regularly for security patches.</p>
<pre><code>FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "server.js"]
</code></pre>
<h2>Run as a non-root user</h2>
<p>The official images usually include an unprivileged user. Use it, and make sure the application only writes to directories it owns. A read-only root filesystem is even better when the app supports it.</p>
<ul>
<li>Set USER after copying files and changing ownership.</li>
<li>Mount writable volumes explicitly.</li>
<li>Drop Linux capabilities the process does not need.</li>
<li>Disable privilege escalation with no-new-privileges.</li>
</ul>
<h2>Scan and sign what you ship</h2>
<p>Scan the final image, not just the source dependencies. Sign the image digest and verify it at deploy time. Tags move; digests do not.</p>
<blockquote>If you cannot explain why a binary is in the runtime image, it probably should not be there.</blockquote>
<p>Smaller images build faster, pull faster, and give attackers less to work with. That is a rare combination of security and developer experience.</p>
`,
  },
  {
    title: 'Golden paths that platform teams can defend',
    slug: 'platform-team-golden-paths',
    category: 'Platform engineering',
    tags: ['platform-engineering', 'developer-experience', 'golden-paths'],
    authorEmail: 'priya@cloudcraftjournal.com',
    publishedAt: '2026-09-12T09:00:00.000Z',
    views: 2510,
    likes: 3,
    excerpt:
      'What makes a golden path a product, how to design one, and how to measure whether teams actually use it.',
    content: `
<p>A golden path is not a mandate. It is a product that makes the safe way to ship software also the shortest way. If the paved road takes longer than the shortcut, engineers will take the shortcut.</p>
<h2>A golden path is a product</h2>
<p>Treat it like one: define the user, the job to be done, and the support model. A platform team that only publishes documentation is not offering a path; it is offering homework.</p>
<h2>What belongs on the path</h2>
<ul>
<li>Service scaffolding with sensible defaults.</li>
<li>CI templates that already pass security checks.</li>
<li>Observability and alerting wired in from day one.</li>
<li>A deployment interface that does not require Kubernetes expertise.</li>
</ul>
<h2>Make the paved road the shortest road</h2>
<p>The request should be a small declarative manifest. The platform owns the translation into deployments, policies, and dashboards.</p>
<pre><code>apiVersion: platform.example.com/v1
kind: Service
metadata:
  name: checkout
spec:
  runtime: container
  port: 8080
  healthCheck: /health
</code></pre>
<h2>Measure adoption, not mandates</h2>
<p>Track how many services use the path, how long it takes to create one, and how often teams leave. A high adoption rate with slow onboarding is a warning sign. A low adoption rate with excellent documentation is a product problem, not a marketing problem.</p>
<blockquote>If teams need a meeting to use the golden path, it is not a path yet.</blockquote>
<p>The best platform teams spend as much time removing friction as they do adding features.</p>
`,
  },
  {
    title: 'An error budget policy that people actually follow',
    slug: 'sre-error-budget-policy',
    category: 'SRE',
    tags: ['sre', 'slo', 'error-budget'],
    authorEmail: 'sam@cloudcraftjournal.com',
    publishedAt: '2026-09-07T09:00:00.000Z',
    views: 2260,
    likes: 3,
    excerpt:
      'Turn an SLO into a policy that changes release decisions before the budget is gone.',
    content: `
<p>An error budget is only useful if it changes a decision. A dashboard that shows the budget burning while everyone keeps shipping is just decoration.</p>
<h2>The budget is a decision, not a dashboard</h2>
<p>Start with an SLO that reflects user experience, then define what happens when the budget is healthy, low, or exhausted. Write it down before the first incident, when nobody is defensive.</p>
<h2>Write the policy before the incident</h2>
<pre><code>errorBudget:
  slo: 99.9%
  window: 30d
  burnRate:
    fast: 14.4
    slow: 6
  actions:
    - at: 50%
      do: review risky changes with the on-call lead
    - at: 90%
      do: pause non-critical feature releases
    - at: 100%
      do: freeze feature work until reliability improves
</code></pre>
<h2>Make the freeze boring</h2>
<p>A freeze should be a known operating mode, not a punishment. Teams need a clear path to exit: fix the top reliability risk, verify the SLO, and resume with a smaller change size.</p>
<ul>
<li>Keep a short list of reliability work that can start immediately.</li>
<li>Protect the budget with faster rollbacks and better canaries.</li>
<li>Review every burn event with the team that owns the service.</li>
<li>Do not use the budget to shame individuals.</li>
</ul>
<blockquote>The purpose of an error budget is to make risk visible while there is still time to choose.</blockquote>
<p>If the policy has never changed a release decision, it is not a policy yet.</p>
`,
  },
  {
    title: 'HPA, VPA, and the autoscaling trap',
    slug: 'kubernetes-autoscaling-hpa-vpa',
    category: 'Kubernetes',
    tags: ['kubernetes', 'autoscaling', 'capacity'],
    authorEmail: 'alex@cloudcraftjournal.com',
    publishedAt: '2026-08-30T09:00:00.000Z',
    views: 2050,
    likes: 3,
    excerpt:
      'Why HPA is not capacity planning, where VPA fits, and the guardrails that stop autoscaling thrash.',
    content: `
<p>Autoscaling is a capacity strategy, not a substitute for one. HPA can add pods quickly, but it cannot create nodes, fix a slow database, or make a cold cache warm instantly.</p>
<h2>HPA is not a capacity plan</h2>
<p>Scale on a signal that leads demand. CPU is convenient but often lags real load. For request-driven services, queue depth or concurrency is usually a better target.</p>
<pre><code>apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout-api
  minReplicas: 3
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
</code></pre>
<h2>Where VPA fits</h2>
<p>Vertical Pod Autoscaling is useful for right-sizing requests, especially for batch workloads and stateful services that do not scale horizontally. Run it in recommendation mode first. Automatic mode can restart pods at inconvenient times.</p>
<h2>Guardrails that prevent thrash</h2>
<ul>
<li>Set a realistic minimum replica count for availability.</li>
<li>Use stabilization windows to avoid rapid scale-down.</li>
<li>Make sure the cluster autoscaler can add nodes before HPA needs them.</li>
<li>Warm caches and connection pools during startup.</li>
</ul>
<blockquote>If scaling up takes four minutes, the real problem may be startup time, not the autoscaler.</blockquote>
<p>Load test the full path: HPA, scheduler, node provisioning, and application warm-up. Autoscaling only works when every layer can keep up.</p>
`,
  },
  {
    title: 'Terraform state locking without the fear',
    slug: 'terraform-state-locking',
    category: 'Terraform',
    tags: ['terraform', 'state', 'disaster-recovery'],
    authorEmail: 'elena@cloudcraftjournal.com',
    publishedAt: '2026-08-24T09:00:00.000Z',
    views: 1870,
    likes: 3,
    excerpt:
      'Remote state, locking, versioning, and the recovery steps for the lock nobody remembers creating.',
    content: `
<p>Terraform state is the most important file in an infrastructure repository. It is also the one people are most afraid to touch. Remote state and locking turn that fear into a normal operational process.</p>
<h2>Remote state is table stakes</h2>
<p>Store state in a versioned object store with encryption enabled. Use a separate key per environment and per stack. Never commit state to git, even in a private repository.</p>
<pre><code>terraform {
  backend "s3" {
    bucket         = "acme-terraform-state"
    key            = "platform/production.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
</code></pre>
<h2>Locking is not a backup</h2>
<p>Locking prevents two applies from running at once. Versioning lets you recover when someone applies the wrong workspace or a provider deletes a resource unexpectedly. Enable both.</p>
<ul>
<li>Turn on object versioning and lifecycle rules.</li>
<li>Restrict write access to the state bucket.</li>
<li>Log who reads and writes state objects.</li>
<li>Test a restore in a non-production account.</li>
</ul>
<h2>Recovering from a stuck lock</h2>
<p>A stale lock usually means a run was interrupted. Confirm nobody is applying, then remove the lock by id.</p>
<pre><code>terraform force-unlock 7f3c1a2b
</code></pre>
<blockquote>If recovering state requires a senior engineer and a shared screen, the process is too fragile.</blockquote>
<p>Document the recovery path, practice it, and keep the state bucket boring.</p>
`,
  },
  {
    title: 'A multi-account AWS strategy that holds up',
    slug: 'aws-multi-account-strategy',
    category: 'AWS',
    tags: ['aws', 'multi-account', 'governance'],
    authorEmail: 'maya@cloudcraftjournal.com',
    publishedAt: '2026-08-18T09:00:00.000Z',
    views: 1620,
    likes: 2,
    excerpt:
      'A practical account structure for blast-radius isolation, consolidated billing, and clean access control.',
    content: `
<p>AWS accounts are the strongest boundary AWS gives you. Using them as folders for teams is tempting, but the real value is isolating blast radius, billing, and access.</p>
<h2>Accounts are boundaries, not folders</h2>
<p>A practical starting point is five account types: organization root, shared services, security, production workloads, and non-production workloads. Add more only when a boundary earns its operational cost.</p>
<ul>
<li>Security tooling and audit logs live in their own account.</li>
<li>Shared networking and DNS live in shared services.</li>
<li>Production and non-production never share credentials.</li>
<li>Each workload team gets access through roles, not long-lived keys.</li>
</ul>
<h2>A landing zone without the ceremony</h2>
<ol>
<li>Create the organization and enable consolidated billing.</li>
<li>Turn on CloudTrail and centralize logs.</li>
<li>Define guardrails with service control policies.</li>
<li>Automate account creation with a repeatable baseline.</li>
</ol>
<h2>Guardrails first, convenience second</h2>
<p>Start with policies that prevent the expensive mistakes: disabling audit logs, using unapproved regions, or creating public storage. Keep the list short enough that teams can understand it.</p>
<h2>Billing is a product feature</h2>
<p>Tag every account and workload consistently. Allocate shared costs with a documented rule. When a team can see its own bill, cost becomes an engineering signal instead of a monthly surprise.</p>
<blockquote>The right number of accounts is the smallest number that keeps production, security, and billing from sharing a failure domain.</blockquote>
`,
  },
  {
    title: 'Runbooks for the incident at 2 a.m.',
    slug: 'incident-response-runbook',
    category: 'SRE',
    tags: ['sre', 'incident-response', 'runbooks'],
    authorEmail: 'jordan@cloudcraftjournal.com',
    publishedAt: '2026-08-11T09:00:00.000Z',
    views: 1435,
    likes: 2,
    excerpt:
      'A runbook format for engineers who did not build the system and are debugging it at 2 a.m.',
    content: `
<p>Runbooks are written for the version of you who is tired, scared, and missing context. If the document assumes the reader built the system, it will fail exactly when you need it most.</p>
<h2>Write for the person who did not build it</h2>
<p>Start with the symptom, not the architecture. The on-call engineer needs to know what customers see and how to confirm the impact before reading a diagram.</p>
<h2>Three sections every runbook needs</h2>
<ol>
<li>Detect: what alert fired, and what does it mean?</li>
<li>Diagnose: the three fastest checks that separate the likely causes.</li>
<li>Act: the safest reversible action, with a rollback.</li>
</ol>
<h2>Commands with guardrails</h2>
<p>Put the exact commands in the runbook, including the namespace and service name. Add a warning before anything destructive.</p>
<pre><code>kubectl -n checkout get pods
kubectl -n checkout rollout status deploy/checkout-api
kubectl -n checkout rollout undo deploy/checkout-api
</code></pre>
<h2>Test it when nothing is on fire</h2>
<p>Run the runbook during a game day. Ask someone who did not write it to follow the steps with production-like data. Every missing step is a future delay during an incident.</p>
<blockquote>A runbook is not documentation for the system. It is documentation for the decision you need to make under pressure.</blockquote>
<p>Review it after every incident and delete steps that no longer match reality.</p>
`,
  },
]

const demoComments = {
  'zero-downtime-kubernetes': [
    [
      'noah.reader@example.com',
      'The readiness probe advice is the part most teams skip. We moved a deep dependency check out of liveness and our restart storms stopped.',
    ],
    [
      'lena.reader@example.com',
      'maxUnavailable: 0 with maxSurge: 1 is also the cheapest reliability win if your cluster has room. Great checklist.',
    ],
  ],
  'terraform-module-structure': [
    [
      'diego.reader@example.com',
      'Splitting state by capability was the change that finally made reviews manageable for us.',
    ],
  ],
  'ci-cd-fail-fast': [
    [
      'ava.reader@example.com',
      'We cut first-failure time from 18 minutes to 4 by moving lint ahead of the build. The cache key tip is underrated.',
    ],
  ],
  'cutting-aws-bill-without-migration': [
    [
      'noah.reader@example.com',
      'The unused volume query found six figures of waste in our account. Start there before buying commitments.',
    ],
    [
      'ava.reader@example.com',
      'NAT gateway data processing was our silent line item. Cross-AZ traffic adds up fast.',
    ],
  ],
  'opentelemetry-tracing-production': [
    [
      'lena.reader@example.com',
      'Tail sampling for errors and slow traces has been the best trade-off for our API team.',
    ],
  ],
  'docker-image-hardening': [
    [
      'diego.reader@example.com',
      'The multi-stage build cut our image from 1.2 GB to 180 MB. Pull times improved immediately.',
    ],
  ],
  'platform-team-golden-paths': [
    [
      'noah.reader@example.com',
      'The product framing is right. Our platform team started publishing onboarding SLAs and adoption changed.',
    ],
  ],
  'sre-error-budget-policy': [
    [
      'ava.reader@example.com',
      'Writing the freeze conditions before the incident removed most of the politics.',
    ],
  ],
  'kubernetes-autoscaling-hpa-vpa': [
    [
      'lena.reader@example.com',
      'The startup time point is critical. HPA cannot save you from a two-minute JVM warm-up.',
    ],
  ],
  'terraform-state-locking': [
    [
      'diego.reader@example.com',
      'Versioning the state bucket saved us after a bad workspace apply. Locking alone would not have helped.',
    ],
  ],
  'aws-multi-account-strategy': [
    [
      'noah.reader@example.com',
      'Five accounts is a good starting point. We added one for data platform and it was worth the boundary.',
    ],
  ],
  'incident-response-runbook': [
    [
      'lena.reader@example.com',
      'Testing the runbook with someone who did not write it is the step everyone skips.',
    ],
    [
      'ava.reader@example.com',
      'The detect, diagnose, act structure is exactly what we needed for our on-call rotation.',
    ],
  ],
}

async function ensureUser({ name, email, role }) {
  const normalized = email.toLowerCase()
  let user = await User.findOne({ email: normalized })

  if (!user) {
    user = await User.create({
      name,
      email: normalized,
      passwordHash: await bcrypt.hash(randomUUID(), 12),
      role,
    })
    console.log(`Created ${role}: ${normalized}`)
    return user
  }

  if (role === 'author' && user.role !== 'author' && user.role !== 'admin') {
    user.role = 'author'
    await user.save()
    console.log(`Promoted ${normalized} to author`)
  }

  return user
}

async function ensureAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD || ''

  if (!email || password.length < 8) {
    console.warn(
      'No admin account created. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (8+ characters) and run the seed again.',
    )
    return null
  }

  let admin = await User.findOne({ email })

  if (!admin) {
    admin = await User.create({
      name: 'CloudCraft Admin',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'admin',
    })
    console.log(`Created admin account: ${email}`)
  } else if (admin.role !== 'admin') {
    admin.role = 'admin'
    await admin.save()
    console.log(`Promoted existing account to admin: ${email}`)
  }

  return admin
}

async function seed() {
  await connectDB()

  await ensureAdmin()

  const authorByEmail = {}
  for (const author of authors) {
    authorByEmail[author.email] = await ensureUser(author)
  }

  const readerByEmail = {}
  for (const reader of readers) {
    readerByEmail[reader.email] = await ensureUser(reader)
  }

  const readerList = readers.map((reader) => readerByEmail[reader.email])
  const postsBySlug = {}

  for (const demo of demoPosts) {
    const slug = slugify(demo.slug || demo.title)
    const author = authorByEmail[demo.authorEmail]
    const content = demo.content.trim()
    const editorial = {
      title: demo.title,
      slug,
      excerpt: demo.excerpt,
      coverImage: `/covers/${slug}.jpg`,
      content,
      category: demo.category,
      tags: demo.tags,
      status: 'published',
      author: author._id,
      readingTime: calculateReadingTime(content),
      publishedAt: new Date(demo.publishedAt),
    }

    let post = await Post.findOne({ slug })

    if (!post) {
      post = await Post.create({ ...editorial, views: demo.views })
      console.log(`Created post: ${slug}`)
    } else {
      post.set(editorial)
      await post.save()
      console.log(`Updated post: ${slug}`)
    }

    if (!post.views) {
      post.views = demo.views
    }

    const demoLikes = readerList.slice(0, demo.likes).map((reader) => reader._id)
    await Post.updateOne(
      { _id: post._id },
      { $addToSet: { likes: { $each: demoLikes } } },
    )

    for (const [readerEmail, body] of demoComments[slug] || []) {
      const commentAuthor = readerByEmail[readerEmail]
      const exists = await Comment.exists({
        post: post._id,
        author: commentAuthor._id,
        body,
      })

      if (!exists) {
        await Comment.create({
          post: post._id,
          author: commentAuthor._id,
          body,
        })
      }
    }

    const commentCount = await Comment.countDocuments({ post: post._id })
    await Post.updateOne(
      { _id: post._id },
      { $set: { views: post.views, commentCount } },
    )

    postsBySlug[slug] = post
  }

  for (const [email, source] of subscribers) {
    await Subscriber.updateOne(
      { email },
      { $setOnInsert: { email, source } },
      { upsert: true },
    )
  }

  console.log(
    `Seed complete: ${Object.keys(postsBySlug).length} posts, ${authors.length} authors, ${readers.length} readers, ${subscribers.length} subscribers.`,
  )
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await disconnectDB()
    } catch (error) {
      console.error('Failed to disconnect from MongoDB:', error.message)
    }
  })
