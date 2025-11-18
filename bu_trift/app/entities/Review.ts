export interface Review {
    id?: string;
    item_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;       // 1~5
    comment: string;
    created_date: string; // ISO string
}

const reviews: Review[] = [];

export const ReviewEntity = {
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

    async filter(filters: Partial<Review>): Promise<Review[]> {
        return reviews.filter((r) => {
            if (filters.item_id && r.item_id !== filters.item_id) return false;
            if (filters.reviewer_id && r.reviewer_id !== filters.reviewer_id) return false;
            if (filters.reviewee_id && r.reviewee_id !== filters.reviewee_id) return false;
            return true;
        });
    },
};