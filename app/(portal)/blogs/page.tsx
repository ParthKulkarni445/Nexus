"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchBar from "@/components/ui/SearchBar";
import {
  BookOpen,
  CircleCheck,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";

type BlogSource = "student" | "tpo";
type ModerationState = "pending" | "needs_review" | "approved";

type BlogPost = {
  id: string;
  title: string;
  company: string;
  source: BlogSource;
  author: string;
  date: string;
  tags: string[];
  excerpt: string;
  qualityScore: number;
  aiAssist: boolean;
  moderation: ModerationState;
  verified: boolean;
};

const BLOGS: BlogPost[] = [
  {
    id: "b-1",
    title: "Amazon SDE On-Campus: Round-by-Round Breakdown",
    company: "Amazon",
    source: "tpo",
    author: "TPO Cell",
    date: "2026-02-14",
    tags: ["sde", "dsa", "interview-rounds"],
    excerpt:
      "Detailed breakdown of OA, machine coding, and final panel, with preparation strategy for each stage.",
    qualityScore: 0.96,
    aiAssist: false,
    moderation: "approved",
    verified: true,
  },
  {
    id: "b-2",
    title: "How I Prepared for Deloitte Consulting Case Round",
    company: "Deloitte",
    source: "student",
    author: "Aditi Sharma",
    date: "2026-02-08",
    tags: ["consulting", "case-study", "aptitude"],
    excerpt:
      "A practical checklist for case frameworks, communication tips, and common pitfalls in group rounds.",
    qualityScore: 0.82,
    aiAssist: true,
    moderation: "approved",
    verified: false,
  },
  {
    id: "b-3",
    title: "Microsoft SWE Internship Interview Experience",
    company: "Microsoft",
    source: "student",
    author: "Rohan Mehta",
    date: "2026-01-30",
    tags: ["internship", "swe", "system-design"],
    excerpt:
      "Interview timeline, key coding themes, and a compact prep plan that helped me clear the final round.",
    qualityScore: 0.74,
    aiAssist: true,
    moderation: "needs_review",
    verified: false,
  },
  {
    id: "b-4",
    title: "Goldman Sachs Analyst Drive Notes",
    company: "Goldman Sachs",
    source: "student",
    author: "Kunal Verma",
    date: "2026-01-24",
    tags: ["finance", "analyst", "sql"],
    excerpt:
      "Summary of test pattern, interview themes, and topic priority list for final week revision.",
    qualityScore: 0.78,
    aiAssist: false,
    moderation: "pending",
    verified: false,
  },
  {
    id: "b-5",
    title: "Placement Season Kickoff: What Recruiters Expect",
    company: "Cross-company",
    source: "tpo",
    author: "Training and Placement Office",
    date: "2026-01-19",
    tags: ["prep", "resume", "communication"],
    excerpt:
      "A verified guidance note on resume hygiene, mock interviews, and discipline expectations.",
    qualityScore: 0.94,
    aiAssist: false,
    moderation: "approved",
    verified: true,
  },
];

const COMPANY_OPTIONS = [
  { value: "Amazon", label: "Amazon" },
  { value: "Deloitte", label: "Deloitte" },
  { value: "Microsoft", label: "Microsoft" },
  { value: "Goldman Sachs", label: "Goldman Sachs" },
  { value: "Cross-company", label: "Cross-company" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sourceBadge(source: BlogSource) {
  if (source === "tpo") {
    return (
      <Badge variant="success" size="sm" dot>
        TPO Verified
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size="sm" dot>
      Student Blog
    </Badge>
  );
}

function moderationBadge(state: ModerationState) {
  if (state === "approved") {
    return (
      <Badge variant="success" size="sm" dot>
        Approved
      </Badge>
    );
  }

  if (state === "needs_review") {
    return (
      <Badge variant="danger" size="sm" dot>
        Needs Review
      </Badge>
    );
  }

  return (
    <Badge variant="gray" size="sm" dot>
      Pending
    </Badge>
  );
}

export default function BlogsPage() {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  const filteredBlogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return BLOGS.filter((blog) => {
      const matchesQuery =
        !term ||
        blog.title.toLowerCase().includes(term) ||
        blog.company.toLowerCase().includes(term) ||
        blog.tags.join(" ").toLowerCase().includes(term);
      const matchesSource = !sourceFilter || blog.source === sourceFilter;
      const matchesCompany = !companyFilter || blog.company === companyFilter;

      return matchesQuery && matchesSource && matchesCompany;
    }).sort((left, right) => {
      if (left.source !== right.source) {
        return left.source === "tpo" ? -1 : 1;
      }
      return +new Date(right.date) - +new Date(left.date);
    });
  }, [query, sourceFilter, companyFilter]);

  const moderationQueue = useMemo(
    () => BLOGS.filter((blog) => blog.source === "student" && blog.moderation !== "approved"),
    [],
  );

  const stats = useMemo(() => {
    const publishedCount = BLOGS.filter((blog) => blog.moderation === "approved").length;
    const tpoCount = BLOGS.filter((blog) => blog.source === "tpo").length;
    const studentCount = BLOGS.filter((blog) => blog.source === "student").length;
    const avgQuality =
      BLOGS.reduce((sum, blog) => sum + blog.qualityScore, 0) / Math.max(BLOGS.length, 1);

    return {
      publishedCount,
      tpoCount,
      studentCount,
      avgQuality,
    };
  }, []);

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 animate-fade-in xl:h-full xl:overflow-y-auto hide-scrollbar">
      <div className="relative z-0 pt-10">
        <div className="card px-5 py-4 sm:px-6 sm:py-5">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
              Blog Hub
            </p>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Experience Blogs and Moderation
                </h1>
                <p className="text-sm text-slate-500">
                  TPO verified posts are prioritized, while student submissions pass through an assisted moderation queue.
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]">
                <BookOpen size={16} />
                Create Blog
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2.5 text-white shadow-sm">
                <p className="text-xs text-blue-100">Published</p>
                <p className="mt-1 text-xl font-semibold">{stats.publishedCount}</p>
              </div>
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                <p className="text-xs text-[#1D4ED8]">TPO Blogs</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{stats.tpoCount}</p>
              </div>
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                <p className="text-xs text-[#1D4ED8]">Student Blogs</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{stats.studentCount}</p>
              </div>
              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2.5">
                <p className="text-xs text-[#1D4ED8]">Avg Quality</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {(stats.avgQuality * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-(--card-border) px-4 py-3">
          <div className="flex flex-col gap-2 lg:flex-row">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search by title, company, or tag"
              className="flex-1"
            />
            <div className="grid grid-cols-2 gap-2 lg:flex">
              <FilterSelect
                value={sourceFilter}
                onChange={setSourceFilter}
                placeholder="All sources"
                className="w-full lg:w-40"
                options={[
                  { label: "Student", value: "student" },
                  { label: "TPO", value: "tpo" },
                ]}
              />
              <FilterSelect
                value={companyFilter}
                onChange={setCompanyFilter}
                placeholder="All companies"
                className="w-full lg:w-44"
                options={COMPANY_OPTIONS}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] items-stretch">
          <section className="space-y-3 h-full">
            {filteredBlogs.map((blog) => (
              <article
                key={blog.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-base font-semibold text-slate-900">{blog.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <UserRound size={13} /> {blog.author}
                      </span>
                      <span>{formatDate(blog.date)}</span>
                      <span>{blog.company}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sourceBadge(blog.source)}
                    {blog.verified && (
                      <Badge variant="info" size="sm" dot>
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-600">{blog.excerpt}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {blog.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Star size={13} className="text-[#2563EB]" />
                    Quality {(blog.qualityScore * 100).toFixed(0)}%
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Sparkles size={13} className="text-[#2563EB]" />
                    {blog.aiAssist ? "AI-assisted checks enabled" : "Manual quality checks"}
                  </div>
                  <div>{moderationBadge(blog.moderation)}</div>
                </div>
              </article>
            ))}
          </section>

          <aside className="card p-4 h-full">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Moderation Queue</h2>
              <Badge variant="danger" size="sm">
                {moderationQueue.length} pending
              </Badge>
            </div>

            <div className="mt-3 space-y-3">
              {moderationQueue.map((blog) => (
                <div
                  key={blog.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-sm font-medium text-slate-900">{blog.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {blog.company} • {blog.author}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {moderationBadge(blog.moderation)}
                    <Badge variant="info" size="sm" dot>
                      PII Check: Passed
                    </Badge>
                  </div>

                  <div className="mt-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-2 text-xs text-[#1D4ED8]">
                    Suggestion: Add one more detailed interview round and include prep resources.
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100">
                      <ShieldCheck size={13} />
                      Review
                    </button>
                    <button className="inline-flex items-center gap-1 rounded-lg border border-[#1D4ED8] bg-[#2563EB] px-2.5 py-1.5 text-xs text-white hover:bg-[#1D4ED8]">
                      <CircleCheck size={13} />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
