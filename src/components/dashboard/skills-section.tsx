"use client";

import { motion } from "framer-motion";
import {
  Layout,
  Server,
  Cloud,
  Activity,
  Bot,
  ShieldCheck,
  Waypoints,
  Terminal,
  Rocket,
  LucideIcon
} from "lucide-react";

type SkillCategory = {
  title: string;
  icon: LucideIcon;
  skills: string[];
};

const skillCategories: SkillCategory[] = [
  {
    title: "UI / Frontend",
    icon: Layout,
    skills: [
      "Next.js Expert",
      "React Expert",
      "Tailwind CSS Expert",
      "Shadcn UI Builder",
      "Responsive Design",
      "Accessibility (WCAG)",
      "Design Systems",
      "Framer Motion Animations",
      "Dashboard Design",
      "Data Visualization",
      "Performance Optimization",
      "UI Testing",
      "Component Architecture",
      "Mobile-First Design"
    ]
  },
  {
    title: "Backend",
    icon: Server,
    skills: [
      "FastAPI Expert",
      "NestJS Expert",
      "REST API Design",
      "GraphQL Design",
      "Microservices Architecture",
      "Event-Driven Architecture",
      "Authentication & Authorization",
      "Database Design",
      "Caching Strategies",
      "Message Queues",
      "API Security",
      "Performance Tuning"
    ]
  },
  {
    title: "DevOps",
    icon: Cloud,
    skills: [
      "Docker Expert",
      "Docker Compose",
      "Kubernetes Expert",
      "Helm Charts",
      "Terraform IaC",
      "Ansible Automation",
      "GitHub Actions",
      "GitOps",
      "ArgoCD",
      "CI/CD Design",
      "Cloud Architecture",
      "Infrastructure Monitoring",
      "Log Management",
      "Secrets Management",
      "Disaster Recovery",
      "Cost Optimization"
    ]
  },
  {
    title: "AIOps",
    icon: Activity,
    skills: [
      "Root Cause Analysis",
      "Incident Response",
      "Observability Engineering",
      "SRE Practices",
      "Log Analysis",
      "Distributed Tracing",
      "Prometheus Queries",
      "Grafana Dashboards",
      "Alert Engineering",
      "Capacity Planning",
      "Anomaly Detection",
      "Reliability Engineering",
      "Performance Diagnostics"
    ]
  },
  {
    title: "AI Engineering",
    icon: Bot,
    skills: [
      "Prompt Engineering",
      "RAG Architecture",
      "LangGraph Development",
      "Agent Design",
      "Multi-Agent Systems",
      "Vector Databases",
      "Embedding Optimization",
      "Tool Calling",
      "Memory Systems",
      "Evaluation Frameworks",
      "LLM Fine-Tuning",
      "Model Serving",
      "Inference Optimization"
    ]
  },
  {
    title: "Security",
    icon: ShieldCheck,
    skills: [
      "DevSecOps",
      "Threat Modeling",
      "Secure Coding",
      "Container Security",
      "Kubernetes Security",
      "IAM Design",
      "Network Security",
      "OWASP Top 10",
      "Secrets Management",
      "Compliance Automation"
    ]
  },
  {
    title: "Architecture",
    icon: Waypoints,
    skills: [
      "System Design",
      "Scalability Design",
      "High Availability",
      "Load Balancing",
      "Caching Architecture",
      "Database Scaling",
      "Event Streaming",
      "Fault Tolerance",
      "Distributed Systems",
      "Multi-Tenant SaaS Design"
    ]
  },
  {
    title: "Linux",
    icon: Terminal,
    skills: [
      "Arch Linux",
      "Shell Scripting",
      "Bash Expert",
      "Zsh Expert",
      "SSH Administration",
      "Systemd",
      "Networking",
      "Performance Analysis",
      "Storage Management",
      "Troubleshooting"
    ]
  },
  {
    title: "Productivity",
    icon: Rocket,
    skills: [
      "Code Review",
      "Technical Documentation",
      "Architecture Decision Records",
      "Project Planning",
      "Requirements Analysis",
      "Technical Leadership",
      "Mentoring",
      "Debugging Methodology"
    ]
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  },
};

export function SkillsSection() {
  return (
    <section className="mt-12 mb-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Technical Arsenal</h2>
          <p className="text-muted-foreground mt-1">Core competencies and domain expertise</p>
        </div>
        <div className="hidden h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent sm:ml-8 sm:block"></div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {skillCategories.map((category) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.title}
              variants={cardVariants}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/50 hover:shadow-[0_0_20px_-5px_rgba(245,184,46,0.1)]"
            >
              {/* Subtle background glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-110 group-hover:bg-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground tracking-tight">
                    {category.title}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-md border border-border/50 bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
