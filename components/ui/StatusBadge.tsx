import Badge from "./Badge";

type CompanyStatus =
  | "not_contacted"
  | "contacted"
  | "positive"
  | "accepted"
  | "rejected"
  | "active"
  | "inactive"
  | "pending"
  | "queued"
  | "sent"
  | "draft"
  | "archived"
  | "confirmed"
  | "completed"
  | "cancelled";

const statusConfig: Record<
  string,
  {
    label: string;
    variant:
      | "default"
      | "success"
      | "warning"
      | "danger"
      | "info"
      | "purple"
      | "gray";
  }
> = {
  not_contacted: { label: "Not Contacted", variant: "gray" },
  contacted: { label: "Contacted", variant: "info" },
  positive: { label: "Positive", variant: "purple" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "gray" },
  pending: { label: "Pending", variant: "warning" },
  queued: { label: "Queued", variant: "success" },
  sent: { label: "Sent", variant: "info" },
  draft: { label: "Draft", variant: "gray" },
  archived: { label: "Archived", variant: "gray" },
  confirmed: { label: "Confirmed", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

export default function StatusBadge({
  status,
  size,
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const cfg = statusConfig[status] ?? {
    label: status,
    variant: "default" as const,
  };
  return (
    <Badge variant={cfg.variant} dot size={size}>
      {cfg.label}
    </Badge>
  );
}
