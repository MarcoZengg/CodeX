export interface Review {
  id?: string;                    // generated on create
  item_id?: string | null;        // optional, in case review is tied to an item
  reviewer_id: string;            // user leaving the review
  reviewee_id: string;            // user being reviewed
  rating: number;                 // 1–5
  comment?: string | null;        // optional comment
  transaction_id?: string | null; // optional link to a transaction
  created_date: string;           // ISO string
}

// Simple in-memory storage for now (no backend request)
const reviews: Review[] = [];

export const ReviewEntity = {
  // Create a new review and keep it in memory
  async create(
    data: Omit<Review, "id" | "created_date">
  ): Promise<Review> {
    const review: Review = {
      id: `review_${Date.now()}`,
      created_date: new Date().toISOString(),
      ...data,
    };

    reviews.push(review);
    return review;
  },

  // Filter reviews by item_id / reviewer_id / reviewee_id
  async filter(filters: Partial<Review>): Promise<Review[]> {
    return reviews.filter((r) => {
      if (filters.item_id !== undefined && r.item_id !== filters.item_id) {
        return false;
      }
      if (
        filters.reviewer_id !== undefined &&
        r.reviewer_id !== filters.reviewer_id
      ) {
        return false;
      }
      if (
        filters.reviewee_id !== undefined &&
        r.reviewee_id !== filters.reviewee_id
      ) {
        return false;
      }
      return true;
    });
  },
};