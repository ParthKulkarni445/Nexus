import { db } from "@/lib/db";
import { getCurrentUser, hasRole } from "@/lib/api/auth";
import BlogsPageClient, {
  type ApiCompany,
  type BlogPost,
} from "./BlogsPageClient";

type UserRole = "tpo_admin" | "coordinator" | "student" | "tech_support";
type VoteType = "upvote" | "downvote";

type BlogRecord = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  moderationStatus: "pending" | "approved" | "rejected";
  moderationNote: string | null;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    role: UserRole;
  };
  company: {
    id: string;
    name: string;
  };
  votes?: {
    userId: string;
    voteType: VoteType;
  }[];
};

function buildExcerpt(content: string) {
  const plain = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= 180) {
    return plain;
  }

  return `${plain.slice(0, 177)}...`;
}

function mapBlog(blog: BlogRecord, currentUserId?: string): BlogPost {
  const source = blog.author.role === "student" ? "student" : "tpo";
  const upvoteCount =
    blog.votes?.filter((vote) => vote.voteType === "upvote").length ?? 0;
  const downvoteCount =
    blog.votes?.filter((vote) => vote.voteType === "downvote").length ?? 0;
  const currentUserVote =
    blog.votes?.find((vote) => vote.userId === currentUserId)?.voteType ?? null;

  return {
    id: blog.id,
    title: blog.title,
    company: blog.company.name,
    source,
    author: blog.author.name,
    date: blog.createdAt.toISOString(),
    tags: blog.tags,
    excerpt: buildExcerpt(blog.body),
    content: blog.body,
    moderation: blog.moderationStatus,
    moderationNote: blog.moderationNote,
    upvoteCount,
    downvoteCount,
    currentUserVote,
  };
}

export default async function BlogsPage() {
  const currentUser = await getCurrentUser();

  const [publishedBlogs, companies] = await Promise.all([
    db.blog.findMany({
      where: {
        moderationStatus: "approved",
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        author: { select: { id: true, name: true, role: true } },
        company: { select: { id: true, name: true } },
        votes: { select: { userId: true, voteType: true } },
      },
    }),
    db.company.findMany({
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true },
    }),
  ]);

  let moderationQueue: BlogPost[] = [];
  let canViewModeration = false;

  if (currentUser && hasRole(currentUser, ["tpo_admin", "coordinator"])) {
    const moderationBlogs = await db.blog.findMany({
      where: { moderationStatus: "pending" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        author: { select: { id: true, name: true, role: true } },
        company: { select: { id: true, name: true } },
      },
    });

    moderationQueue = moderationBlogs.map((blog) => mapBlog(blog));
    canViewModeration = true;
  }

  const initialBlogs = publishedBlogs.map((blog) =>
    mapBlog(blog, currentUser?.id),
  );
  const initialCompanies: ApiCompany[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
  }));

  return (
    <BlogsPageClient
      initialBlogs={initialBlogs}
      initialCompanies={initialCompanies}
      initialModerationQueue={moderationQueue}
      initialCanViewModeration={canViewModeration}
    />
  );
}
