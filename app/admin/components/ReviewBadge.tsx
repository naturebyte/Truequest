type ReviewBadgeProps = {
  status: "approved" | "under_review";
};

export function ReviewBadge({ status }: ReviewBadgeProps) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Approved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
      Under Review
    </span>
  );
}
