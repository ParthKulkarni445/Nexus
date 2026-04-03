import BlogsLoadingView from "@/app/(portal)/blogs/BlogsLoadingView";

export default function Loading() {
  return <BlogsLoadingView showCreateButton={false} showModerationPanel={false} />;
}
