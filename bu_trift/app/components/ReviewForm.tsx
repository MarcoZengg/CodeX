import type { Review as ReviewType } from "@/entities/Review";

interface ReviewFormProps {
  reviewerId: string;
  revieweeId: string;
  onCreated?: (review: ReviewType) => void;
}

export default function ReviewForm(_props: ReviewFormProps) {
  // temporary stub – real UI can be implemented later
  return null;
}
