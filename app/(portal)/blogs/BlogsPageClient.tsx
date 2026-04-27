"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Badge from "@/components/ui/Badge";
import FilterSelect from "@/components/ui/FilterSelect";
import Modal from "@/components/ui/Modal";
import RichTextEditor from "@/components/ui/RichTextEditor";
import SearchBar from "@/components/ui/SearchBar";
import {
  BookOpen,
  AlertCircle,
  CheckCircle2,
  CircleCheck,
  ShieldCheck,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  ChevronRight,
  X,
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
  allowDelete?: boolean;
  showModerationPanel?: boolean;
};

type ActionFlushbar = {
  id: number;
  tone: "warning" | "error" | "success";
  message: string;
  progress: number;
};

const WARNING_FLUSHBAR_DURATION_MS = 3500;

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
  allowDelete = false,
  showModerationPanel = true,
}: BlogsPageClientProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>(initialBlogs);
  const [companies] = useState<ApiCompany[]>(initialCompanies);
  const [moderationQueue, setModerationQueue] = useState<BlogPost[]>(
    initialModerationQueue,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [activeVoteBlogId, setActiveVoteBlogId] = useState<string | null>(null);
  const [activeDeleteBlogId, setActiveDeleteBlogId] = useState<string | null>(
    null,
  );
  const [blogToDelete, setBlogToDelete] = useState<BlogPost | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [reviewingBlog, setReviewingBlog] = useState<BlogPost | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [canViewModeration] = useState(initialCanViewModeration);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const BLOGS_PER_PAGE = 10;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createBody, setCreateBody] = useState("<p></p>");
  const [createTags, setCreateTags] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [actionFlushbar, setActionFlushbar] = useState<ActionFlushbar | null>(
    null,
  );
  const actionFlushbarProgressTimerRef = useRef<number | null>(null);
  const actionFlushbarHideTimerRef = useRef<number | null>(null);

  const clearActionFlushbarTimers = useCallback(() => {
    if (actionFlushbarProgressTimerRef.current !== null) {
      window.clearTimeout(actionFlushbarProgressTimerRef.current);
      actionFlushbarProgressTimerRef.current = null;
    }

    if (actionFlushbarHideTimerRef.current !== null) {
      window.clearTimeout(actionFlushbarHideTimerRef.current);
      actionFlushbarHideTimerRef.current = null;
    }
  }, []);

  const dismissActionFlushbar = useCallback(() => {
    clearActionFlushbarTimers();
    setActionFlushbar(null);
  }, [clearActionFlushbarTimers]);

  const showActionFlushbar = useCallback(
    (tone: "warning" | "error" | "success", message: string) => {
      dismissActionFlushbar();

      const id = Date.now() + Math.floor(Math.random() * 1000);
      setActionFlushbar({ id, tone, message, progress: 100 });

      actionFlushbarProgressTimerRef.current = window.setTimeout(() => {
        setActionFlushbar((current) =>
          current?.id === id ? { ...current, progress: 0 } : current,
        );
      }, 30);

      actionFlushbarHideTimerRef.current = window.setTimeout(() => {
        setActionFlushbar((current) => (current?.id === id ? null : current));
      }, WARNING_FLUSHBAR_DURATION_MS + 30);
    },
    [dismissActionFlushbar],
  );

  const showActionError = useCallback(
    (message: string) => {
      showActionFlushbar("error", message);
    },
    [showActionFlushbar],
  );

  const showActionSuccess = useCallback(
    (message: string) => {
      showActionFlushbar("success", message);
    },
    [showActionFlushbar],
  );

  useEffect(
    () => () => clearActionFlushbarTimers(),
    [clearActionFlushbarTimers],
  );

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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, sourceFilter, companyFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBlogs.length / BLOGS_PER_PAGE);
  const startIndex = (currentPage - 1) * BLOGS_PER_PAGE;
  const endIndex = startIndex + BLOGS_PER_PAGE;
  const paginatedBlogs = filteredBlogs.slice(startIndex, endIndex);

  const activeFilterCount = sourceFilter.length + companyFilter.length;

  async function approveBlog(blogId: string) {
    setActiveBlogId(blogId);

    try {
      const response = await fetch(`/api/v1/blogs/${blogId}/approve`, {
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = "Failed to approve blog";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If response body isn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
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
      }

      showActionSuccess("Blog approved successfully.");
    } catch (error) {
      console.error("Error approving blog:", error);
      showActionError(
        error instanceof Error
          ? error.message
          : "Unable to approve this blog right now. Please try again.",
      );
    } finally {
      setActiveBlogId(null);
    }
  }

  async function rejectBlog(blogId: string, moderationNote: string) {
    setActiveBlogId(blogId);

    try {
      const response = await fetch(`/api/v1/blogs/${blogId}/reject`, {
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
      }

      showActionSuccess("Blog rejected successfully.");
    } catch (error) {
      console.error("Error submitting review:", error);
      showActionError(
        error instanceof Error
          ? error.message
          : "Unable to submit this review right now. Please try again.",
      );
    } finally {
      setActiveBlogId(null);
    }
  }

  async function submitVote(blogId: string, voteType: VoteType) {
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
      showActionError(
        "Unable to update your vote right now. Please try again.",
      );
    } finally {
      setActiveVoteBlogId(null);
    }
  }

  async function deleteBlog(blogId: string) {
    if (!allowDelete) {
      return;
    }

    setActiveDeleteBlogId(blogId);

    try {
      const response = await fetch(`/api/v1/blogs/${blogId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete blog";
        try {
          const errorData = (await response.json()) as {
            error?: { message?: string };
            message?: string;
          };
          errorMessage =
            errorData.error?.message ?? errorData.message ?? errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      setBlogs((current) => current.filter((blog) => blog.id !== blogId));
      setModerationQueue((current) =>
        current.filter((blog) => blog.id !== blogId),
      );

      if (selectedBlog?.id === blogId) {
        setSelectedBlog(null);
      }

      if (blogToDelete?.id === blogId) {
        setBlogToDelete(null);
      }

      if (reviewingBlog?.id === blogId) {
        setReviewingBlog(null);
      }

      showActionSuccess("Blog deleted successfully.");
    } catch (error) {
      console.error("Error deleting blog:", error);
      showActionError(
        error instanceof Error
          ? error.message
          : "Unable to delete this blog right now. Please try again.",
      );
    } finally {
      setActiveDeleteBlogId(null);
    }
  }

  function requestDeleteBlog(blog: BlogPost) {
    if (!allowDelete || activeDeleteBlogId) {
      return;
    }

    setBlogToDelete(blog);
  }

  function closeDeleteConfirmModal() {
    if (activeDeleteBlogId) {
      return;
    }

    setBlogToDelete(null);
  }

  function submitDeleteFromModal() {
    if (!blogToDelete) {
      return;
    }

    void deleteBlog(blogToDelete.id);
  }

  function openReviewModal(blog: BlogPost) {
    setReviewingBlog(blog);
    setReviewNote(blog.moderationNote ?? "");
  }

  function closeReviewModal() {
    if (activeBlogId) {
      return;
    }

    setReviewingBlog(null);
    setReviewNote("");
  }

  function submitRejectFromReview() {
    if (!reviewingBlog) {
      return;
    }

    const trimmedNote = reviewNote.trim();
    if (!trimmedNote) {
      showActionFlushbar(
        "warning",
        "Review note is required to reject this blog.",
      );
      return;
    }

    void rejectBlog(reviewingBlog.id, trimmedNote);
  }

  function openCreateModal() {
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
      showActionFlushbar("warning", "Please select a company.");
      return;
    }

    if (!createTitle.trim()) {
      showActionFlushbar("warning", "Please enter a title.");
      return;
    }

    if (!buildContent(createBody)) {
      showActionFlushbar("warning", "Please enter blog content.");
      return;
    }

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

      showActionSuccess(
        payload.data?.moderationStatus === "approved"
          ? "Blog published successfully."
          : "Blog submitted for moderation.",
      );
      setIsCreateModalOpen(false);
      setCreateCompanyId("");
      setCreateTitle("");
      setCreateBody("<p></p>");
      setCreateTags("");
    } catch (error) {
      console.error("Error creating blog:", error);
      showActionError(
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
      {actionFlushbar ? (
        <div className="flushbar-stack fixed right-4 bottom-4 z-50 w-[min(92vw,600px)] pointer-events-none">
          <div
            className={`flushbar flushbar-${actionFlushbar.tone} rounded-xl border shadow-lg`}
          >
            <div className="flushbar-progress-track h-1 w-full">
              <div
                className="flushbar-progress h-full"
                style={{
                  width: `${actionFlushbar.progress}%`,
                  transition: `width ${WARNING_FLUSHBAR_DURATION_MS}ms linear`,
                }}
              />
            </div>
            <div className="flushbar-body flex items-start gap-2.5 px-3.5 py-3">
              {actionFlushbar.tone === "success" ? (
                <CheckCircle2
                  size={36}
                  className="flushbar-icon shrink-0 mt-0.5"
                />
              ) : (
                <AlertCircle
                  size={36}
                  className="flushbar-icon shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1 space-y-0.5 min-w-0">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {actionFlushbar.tone === "error"
                    ? "ERROR"
                    : actionFlushbar.tone === "warning"
                      ? "WARNING"
                      : "SUCCESS"}
                </p>
                <p className="flushbar-message m-0 text-[14px] font-medium leading-[1.45] whitespace-normal wrap-break-word">
                  {actionFlushbar.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 items-stretch xl:grid-cols-1 relative">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search by title, company, or tag"
              className="min-w-0 flex-1 border border-slate-300 rounded-lg"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <FilterSelect
                  multiple
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  placeholder="Source"
                  className="z-20 w-full sm:w-40 xl:w-40"
                  options={[
                    { label: "Student", value: "student" },
                    { label: "TPO", value: "tpo" },
                  ]}
                />
              </div>
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <FilterSelect
                  multiple
                  value={companyFilter}
                  onChange={setCompanyFilter}
                  placeholder="Company"
                  className="z-20 w-full sm:w-40 xl:w-40"
                  options={companyOptions}
                />
              </div>
              {activeFilterCount > 0 && (
                <button
                  className="btn btn-ghost btn-sm shrink-0 text-slate-500 hover:text-slate-700 text-xs"
                  onClick={() => {
                    setSourceFilter([]);
                    setCompanyFilter([]);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <section className="overflow-hidden border-2 bg-slate-50 border-slate-300 rounded-lg">
            <div className="px-4 py-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Latest Blogs
              </h2>
              <div className="flex items-center gap-2">
                {showModerationPanel && canViewModeration && (
                  <button
                    type="button"
                    onClick={() => setIsModerationOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <ShieldCheck size={16} />
                    Queue
                    {moderationQueue.length > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-xs font-bold text-slate-900">
                        {moderationQueue.length}
                      </span>
                    )}
                  </button>
                )}
                {allowCreate && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="btn btn-primary inline-flex items-center gap-2"
                  >
                    <BookOpen size={16} />
                    Create
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 pb-4 pt-2 space-y-3">
              {!loadError && filteredBlogs.length === 0 && (
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No blogs found for the current filters.
                </div>
              )}

              {paginatedBlogs.map((blog) => (
                <article
                  key={blog.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    openBlogReader(blog);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openBlogReader(blog);
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white p-4 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
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
                      onClick={(event) => {
                        event.stopPropagation();
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
                      onClick={(event) => {
                        event.stopPropagation();
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

                    {allowDelete && (
                      <button
                        type="button"
                        disabled={activeDeleteBlogId === blog.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          requestDeleteBlog(blog);
                        }}
                        className="btn btn-secondary btn-sm ml-auto"
                      >
                        <Trash2 size={13} />
                        {activeDeleteBlogId === blog.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    )}
                  </div>
                </article>
              ))}

              {/* Pagination Controls */}
              {filteredBlogs.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                  <div className="text-xs text-slate-600">
                    Showing{" "}
                    <span className="font-semibold">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold">
                      {Math.min(endIndex, filteredBlogs.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold">
                      {filteredBlogs.length}
                    </span>{" "}
                    blogs
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                              currentPage === page
                                ? "bg-[#2563EB] text-white"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {page}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Moderation Queue Drawer - Right Overlay */}
        {showModerationPanel && isModerationOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="fixed inset-0 bg-black/30"
              onClick={() => setIsModerationOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white border-l-2 border-slate-300 overflow-y-auto">
              <div className="p-4 border-b border-slate-200 sticky top-0 bg-white flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Moderation Queue
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModerationOpen(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {!canViewModeration && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    You do not have permission to view moderation items.
                  </div>
                )}

                {canViewModeration && moderationQueue.length === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    No pending blogs in moderation queue.
                  </div>
                )}

                {moderationQueue.map((blog) => (
                  <div
                    key={blog.id}
                    className="rounded-lg border border-slate-300 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {blog.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {blog.company}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {blog.author} • {formatDate(blog.date)}
                    </p>

                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={activeBlogId === blog.id}
                        onClick={() => {
                          openReviewModal(blog);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ShieldCheck size={13} />
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedBlog)}
        onClose={closeBlogReader}
        title={selectedBlog ? selectedBlog.title : "Blog"}
        size="xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeBlogReader}>
              Close
            </button>
            {allowDelete && selectedBlog && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  requestDeleteBlog(selectedBlog);
                }}
                disabled={activeDeleteBlogId === selectedBlog.id}
              >
                <Trash2 size={14} />
                {activeDeleteBlogId === selectedBlog.id
                  ? "Deleting..."
                  : "Delete Blog"}
              </button>
            )}
          </>
        }
      >
        {selectedBlog && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3">
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
                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Full Blog Content
              </p>
              <RichTextEditor
                className="mt-2"
                value={selectedBlog.content || "<p>No content available.</p>"}
                onChange={() => {
                  // Read-only viewer mode.
                }}
                readOnly
              />
            </div>
          </div>
        )}
      </Modal>

      {allowDelete && (
        <Modal
          isOpen={Boolean(blogToDelete)}
          onClose={closeDeleteConfirmModal}
          title="Delete Blog"
          size="md"
          footer={
            <>
              <button
                className="btn btn-ghost"
                onClick={closeDeleteConfirmModal}
              >
                Cancel
              </button>
              <button
                className="btn btn-secondary"
                onClick={submitDeleteFromModal}
                disabled={
                  !blogToDelete || activeDeleteBlogId === blogToDelete.id
                }
              >
                <Trash2 size={14} />
                {blogToDelete && activeDeleteBlogId === blogToDelete.id
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-700">
            Delete <strong>{blogToDelete?.title}</strong>? This action cannot be
            undone.
          </p>
        </Modal>
      )}

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
            <p className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">
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
                <RichTextEditor
                  className="mt-2"
                  value={
                    reviewingBlog.content || "<p>No content available.</p>"
                  }
                  onChange={() => {
                    // Read-only viewer mode.
                  }}
                  readOnly
                />
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
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
