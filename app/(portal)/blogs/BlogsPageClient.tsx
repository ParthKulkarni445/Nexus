"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import FilterSelect from "@/components/ui/FilterSelect";
import Modal from "@/components/ui/Modal";
import RichTextEditor from "@/components/ui/RichTextEditor";
import SearchBar from "@/components/ui/SearchBar";
import {
  BookOpen,
  CircleCheck,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";

type BlogSource = "student" | "tpo";
type ModerationState = "pending" | "approved" | "rejected";
type VoteType = "upvote" | "downvote";

export type ApiCompany = {
  id: string;
  name: string;
};

export type BlogPost = {
  id: string;
  title: string;
  company: string;
  source: BlogSource;
  author: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
  moderation: ModerationState;
  moderationNote: string | null;
  upvoteCount: number;
  downvoteCount: number;
  currentUserVote: VoteType | null;
};

type BlogsPageClientProps = {
  initialBlogs: BlogPost[];
  initialCompanies: ApiCompany[];
  initialModerationQueue: BlogPost[];
  initialCanViewModeration: boolean;
  allowCreate?: boolean;
  showModerationPanel?: boolean;
};

function buildContent(content: string) {
  return content
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
        TPO
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size="sm" dot>
      Student Blog
    </Badge>
  );
}

export default function BlogsPageClient({
  initialBlogs,
  initialCompanies,
  initialModerationQueue,
  initialCanViewModeration,
  allowCreate = true,
  showModerationPanel = true,
}: BlogsPageClientProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>(initialBlogs);
  const [companies] = useState<ApiCompany[]>(initialCompanies);
  const [moderationQueue, setModerationQueue] =
    useState<BlogPost[]>(initialModerationQueue);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [activeVoteBlogId, setActiveVoteBlogId] = useState<string | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [reviewingBlog, setReviewingBlog] = useState<BlogPost | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [canViewModeration] = useState(initialCanViewModeration);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createBody, setCreateBody] = useState("<p></p>");
  const [createTags, setCreateTags] = useState("");
  const [createAiAssisted, setCreateAiAssisted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const companyOptions = useMemo(
    () =>
      Array.from(new Set(blogs.map((blog) => blog.company)))
        .sort((left, right) => left.localeCompare(right))
        .map((company) => ({
          value: company,
          label: company,
        })),
    [blogs],
  );

  const filteredBlogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return blogs
      .filter((blog) => {
        const matchesQuery =
          !term ||
          blog.title.toLowerCase().includes(term) ||
          blog.company.toLowerCase().includes(term) ||
          blog.tags.join(" ").toLowerCase().includes(term);
        const matchesSource =
          sourceFilter.length === 0 || sourceFilter.includes(blog.source);
        const matchesCompany =
          companyFilter.length === 0 || companyFilter.includes(blog.company);

        return matchesQuery && matchesSource && matchesCompany;
      })
      .sort((left, right) => {
        const leftScore = left.upvoteCount - left.downvoteCount;
        const rightScore = right.upvoteCount - right.downvoteCount;

        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }

        if (left.upvoteCount !== right.upvoteCount) {
          return right.upvoteCount - left.upvoteCount;
        }

        return +new Date(right.date) - +new Date(left.date);
      });
  }, [blogs, query, sourceFilter, companyFilter]);

  const activeFilterCount = sourceFilter.length + companyFilter.length;

  async function approveBlog(blogId: string) {
    setActionError(null);
    setActiveBlogId(blogId);

    try {
      const response = await fetch(`/api/v1/admin/blogs/${blogId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to approve blog");
      }

      const approvedFromQueue = moderationQueue.find(
        (blog) => blog.id === blogId,
      );

      setModerationQueue((current) =>
        current.filter((blog) => blog.id !== blogId),
      );

      if (approvedFromQueue) {
        setBlogs((current) => {
          if (current.some((blog) => blog.id === blogId)) {
            return current;
          }

          return [{ ...approvedFromQueue, moderation: "approved" }, ...current];
        });
      }

      if (reviewingBlog?.id === blogId) {
        setReviewingBlog(null);
        setReviewNote("");
        setReviewFormError(null);
      }
    } catch (error) {
      console.error("Error approving blog:", error);
      setActionError(
        "Unable to approve this blog right now. Please try again.",
      );
    } finally {
      setActiveBlogId(null);
    }
  }

  async function rejectBlog(blogId: string, moderationNote: string) {
    setActionError(null);
    setActiveBlogId(blogId);

    try {
      const response = await fetch(`/api/v1/admin/blogs/${blogId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moderationNote: moderationNote.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit review");
      }

      setModerationQueue((current) =>
        current.filter((blog) => blog.id !== blogId),
      );

      if (reviewingBlog?.id === blogId) {
        setReviewingBlog(null);
        setReviewNote("");
        setReviewFormError(null);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      setActionError(
        "Unable to submit this review right now. Please try again.",
      );
    } finally {
      setActiveBlogId(null);
    }
  }

  async function submitVote(blogId: string, voteType: VoteType) {
    setVoteError(null);
    setActiveVoteBlogId(blogId);

    try {
      const response = await fetch(`/api/v1/blogs/${blogId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voteType }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote on blog");
      }

      const payload = (await response.json()) as {
        data?: {
          blogId: string;
          upvoteCount: number;
          downvoteCount: number;
          currentUserVote: VoteType | null;
        };
      };

      if (!payload.data) {
        throw new Error("Invalid vote response");
      }

      setBlogs((current) =>
        current.map((blog) =>
          blog.id === payload.data!.blogId
            ? {
                ...blog,
                upvoteCount: payload.data!.upvoteCount,
                downvoteCount: payload.data!.downvoteCount,
                currentUserVote: payload.data!.currentUserVote,
              }
            : blog,
        ),
      );
    } catch (error) {
      console.error("Error voting on blog:", error);
      setVoteError("Unable to update your vote right now. Please try again.");
    } finally {
      setActiveVoteBlogId(null);
    }
  }

  function openReviewModal(blog: BlogPost) {
    setReviewingBlog(blog);
    setReviewNote(blog.moderationNote ?? "");
    setReviewFormError(null);
    setActionError(null);
  }

  function closeReviewModal() {
    if (activeBlogId) {
      return;
    }

    setReviewingBlog(null);
    setReviewNote("");
    setReviewFormError(null);
  }

  function submitRejectFromReview() {
    if (!reviewingBlog) {
      return;
    }

    const trimmedNote = reviewNote.trim();
    if (!trimmedNote) {
      setReviewFormError("Review note is required to reject this blog.");
      return;
    }

    setReviewFormError(null);
    void rejectBlog(reviewingBlog.id, trimmedNote);
  }

  function openCreateModal() {
    setCreateError(null);
    setCreateSuccess(null);
    setIsCreateModalOpen(true);
  }

  function openBlogReader(blog: BlogPost) {
    setSelectedBlog(blog);
  }

  function closeBlogReader() {
    setSelectedBlog(null);
  }

  function closeCreateModal() {
    if (isCreating) {
      return;
    }

    setIsCreateModalOpen(false);
  }

  async function submitCreateBlog() {
    if (!createCompanyId) {
      setCreateError("Please select a company.");
      return;
    }

    if (!createTitle.trim()) {
      setCreateError("Please enter a title.");
      return;
    }

    if (!buildContent(createBody)) {
      setCreateError("Please enter blog content.");
      return;
    }

    setCreateError(null);
    setCreateSuccess(null);
    setIsCreating(true);

    try {
      const tags = createTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const response = await fetch("/api/v1/blogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: createCompanyId,
          title: createTitle.trim(),
          body: createBody,
          tags,
          isAiAssisted: createAiAssisted,
        }),
      });

      if (!response.ok) {
        let message = "Unable to create blog right now. Please try again.";

        try {
          const payload = (await response.json()) as {
            error?: { message?: string };
            message?: string;
          };

          message = payload.error?.message ?? payload.message ?? message;
        } catch {
          // Keep default message when error body is unavailable.
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as {
        data?: {
          moderationStatus?: ModerationState;
        };
      };

      setCreateSuccess(
        payload.data?.moderationStatus === "approved"
          ? "Blog published successfully."
          : "Blog submitted for moderation.",
      );
      setIsCreateModalOpen(false);
      setCreateCompanyId("");
      setCreateTitle("");
      setCreateBody("<p></p>");
      setCreateTags("");
      setCreateAiAssisted(false);
    } catch (error) {
      console.error("Error creating blog:", error);
      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create blog right now. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="-mt-6 xl:mt-0 space-y-5 px-4 pb-6 pt-6 xl:h-full xl:overflow-y-auto hide-scrollbar">
      {createSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {createSuccess}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-4 items-stretch ${
          showModerationPanel
            ? "xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]"
            : "xl:grid-cols-1"
        }`}
      >
        <div className="min-w-0 space-y-4">
          <div className="card overflow-visible flex flex-col">
            <div className="px-4 py-3 border-b border-(--card-border)">
              <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by title, company, or tag"
                  className="min-w-0 xl:min-w-[320px] xl:flex-[1.2]"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:shrink-0">
                  <FilterSelect
                    multiple
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    placeholder="Source"
                    className="z-20 w-full xl:w-44"
                    options={[
                      { label: "Student", value: "student" },
                      { label: "TPO", value: "tpo" },
                    ]}
                  />
                  <FilterSelect
                    multiple
                    value={companyFilter}
                    onChange={setCompanyFilter}
                    placeholder="Company"
                    className="z-20 w-full xl:w-44"
                    options={companyOptions}
                  />
                </div>

                {activeFilterCount > 0 && (
                  <button
                    className="btn btn-ghost btn-sm shrink-0 self-start text-slate-500 hover:text-slate-700 xl:self-auto"
                    onClick={() => {
                      setSourceFilter([]);
                      setCompanyFilter([]);
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>

          <section className="card overflow-hidden">
            <div className="border-b border-(--card-border) px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Latest Blogs
                </h2>
                {allowCreate && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1D4ED8] bg-[#2563EB] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
                  >
                    <BookOpen size={16} />
                    Create Blog
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {voteError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {voteError}
                </div>
              )}

              {loadError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {loadError}
                </div>
              )}

              {!loadError && filteredBlogs.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No blogs found for the current filters.
                </div>
              )}

              {filteredBlogs.map((blog) => (
                <article
                  key={blog.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="text-base font-semibold text-slate-900">
                        {blog.title}
                      </p>
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

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={activeVoteBlogId === blog.id}
                      aria-label={`Upvote (${blog.upvoteCount})`}
                      onClick={() => {
                        void submitVote(blog.id, "upvote");
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        blog.currentUserVote === "upvote"
                          ? "border-[#1D4ED8] bg-[#2563EB] text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <ThumbsUp size={13} />
                      <span className="tabular-nums">{blog.upvoteCount}</span>
                    </button>

                    <button
                      type="button"
                      disabled={activeVoteBlogId === blog.id}
                      aria-label={`Downvote (${blog.downvoteCount})`}
                      onClick={() => {
                        void submitVote(blog.id, "downvote");
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        blog.currentUserVote === "downvote"
                          ? "border-black bg-black text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <ThumbsDown size={13} />
                      <span className="tabular-nums">{blog.downvoteCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openBlogReader(blog);
                      }}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1.5 text-xs font-medium text-[#1D4ED8] hover:bg-[#DBEAFE]"
                    >
                      Read full blog
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {showModerationPanel && (
          <aside className="card p-4 h-full">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Moderation Queue
              </h2>
              <Badge variant="danger" size="sm">
                {moderationQueue.length} in queue
              </Badge>
            </div>

            <div className="mt-3 space-y-3">
              {actionError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {actionError}
                </div>
              )}

              {!canViewModeration && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  You do not have permission to view moderation items.
                </div>
              )}

              {canViewModeration && moderationQueue.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  No pending blogs in moderation queue.
                </div>
              )}

              {moderationQueue.map((blog) => (
                <div
                  key={blog.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {blog.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {blog.company} • {blog.author}
                  </p>

                  <div className="mt-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-2 text-xs text-[#1D4ED8]">
                    {blog.moderationNote ?? "No moderator note yet."}
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={activeBlogId === blog.id}
                      onClick={() => {
                        openReviewModal(blog);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShieldCheck size={13} />
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedBlog)}
        onClose={closeBlogReader}
        title={selectedBlog ? selectedBlog.title : "Blog"}
        size="xl"
        footer={
          <button className="btn btn-secondary" onClick={closeBlogReader}>
            Close
          </button>
        }
      >
        {selectedBlog && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">
                {selectedBlog.company}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedBlog.author} • {formatDate(selectedBlog.date)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {sourceBadge(selectedBlog.source)}
                {selectedBlog.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Full Blog Content
              </p>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {selectedBlog.content || "No content available."}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {allowCreate && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          title="Create Blog"
          size="lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={closeCreateModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  void submitCreateBlog();
                }}
                disabled={isCreating}
              >
                <BookOpen size={14} />
                {isCreating ? "Submitting..." : "Submit"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1D4ED8]">
              Student blogs require moderation, while TPO blogs are published
              directly.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Company *
              </label>
              <select
                className="input-base"
                value={createCompanyId}
                onChange={(event) => setCreateCompanyId(event.target.value)}
                disabled={isCreating}
              >
                <option value="">-- Select company --</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Title *
              </label>
              <input
                className="input-base"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                placeholder="Enter blog title"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Blog Content *
              </label>
              <RichTextEditor
                value={createBody}
                onChange={setCreateBody}
                placeholder="Write your blog content here..."
              />
              <p className="mt-1 text-xs text-slate-500">
                Format text with headings, lists, and links.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tags
              </label>
              <input
                className="input-base"
                value={createTags}
                onChange={(event) => setCreateTags(event.target.value)}
                placeholder="Comma separated tags (example: interview, prep, experience)"
                disabled={isCreating}
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={createAiAssisted}
                onChange={(event) => setCreateAiAssisted(event.target.checked)}
                disabled={isCreating}
              />
              AI-assisted content
            </label>

            {createError && (
              <p className="text-xs font-medium text-red-600">{createError}</p>
            )}
          </div>
        </Modal>
      )}

      {showModerationPanel && (
        <Modal
          isOpen={Boolean(reviewingBlog)}
          onClose={closeReviewModal}
          title={reviewingBlog ? `Review - ${reviewingBlog.title}` : "Review"}
          size="xl"
          footer={
            <>
              <button className="btn btn-secondary" onClick={closeReviewModal}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={submitRejectFromReview}
                disabled={!reviewingBlog || activeBlogId === reviewingBlog.id}
              >
                <ShieldCheck size={14} />
                {activeBlogId && reviewingBlog?.id === activeBlogId
                  ? "Saving..."
                  : "Reject"}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!reviewingBlog) {
                    return;
                  }

                  void approveBlog(reviewingBlog.id);
                }}
                disabled={!reviewingBlog || activeBlogId === reviewingBlog.id}
              >
                <CircleCheck size={14} />
                {activeBlogId && reviewingBlog?.id === activeBlogId
                  ? "Approving..."
                  : "Approve"}
              </button>
            </>
          }
        >
          {reviewingBlog && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-base font-semibold text-slate-900">
                  {reviewingBlog.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {reviewingBlog.company} • {reviewingBlog.author} •{" "}
                  {formatDate(reviewingBlog.date)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {reviewingBlog.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Blog Content
                </p>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {reviewingBlog.content || "No content available."}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Rejection Note (required only when rejecting)
                </label>
                <textarea
                  rows={3}
                  className="input-base"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Mention what should be changed before approval..."
                  disabled={activeBlogId === reviewingBlog.id}
                />
                {reviewFormError && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {reviewFormError}
                  </p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
