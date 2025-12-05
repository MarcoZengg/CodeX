import { API_URL } from "../config";
import { fetchWithAuth, getFirebaseToken } from "../utils/auth";

export interface Review {
    id?: string;
    transaction_id: string;
    item_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;       // 1~5
    comment?: string | null;
    response?: string | null;
    created_date?: string;
    updated_date?: string;
}

export interface ReviewCreate {
    transaction_id: string;
    rating: number;  // 1-5
    comment?: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await getFirebaseToken(false);
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

export class ReviewEntity {
    static async create(data: ReviewCreate): Promise<Review> {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithAuth(`${API_URL}/api/reviews`, {
                method: "POST",
                headers,
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to create review: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating review:", error);
            throw error;
        }
    }

    static async getByUser(user_id: string): Promise<Review[]> {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithAuth(`${API_URL}/api/reviews?user_id=${user_id}`, {
                method: "GET",
                headers,
            });

            if (!response.ok) {
                throw new Error(`Failed to get reviews: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error getting reviews by user:", error);
            throw error;
        }
    }

    static async getByTransaction(transaction_id: string): Promise<Review[]> {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithAuth(`${API_URL}/api/reviews?transaction_id=${transaction_id}`, {
                method: "GET",
                headers,
            });

            if (!response.ok) {
                throw new Error(`Failed to get reviews: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error getting reviews by transaction:", error);
            throw error;
        }
    }

    static async getByItem(item_id: string): Promise<Review[]> {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithAuth(`${API_URL}/api/reviews?item_id=${item_id}`, {
                method: "GET",
                headers,
            });

            if (!response.ok) {
                throw new Error(`Failed to get reviews: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error getting reviews by item:", error);
            throw error;
        }
    }

    static async get(review_id: string): Promise<Review> {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithAuth(`${API_URL}/api/reviews/${review_id}`, {
                method: "GET",
                headers,
            });

            if (!response.ok) {
                throw new Error(`Failed to get review: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error getting review:", error);
            throw error;
        }
    }

    static async addResponse(review_id: string, response: string): Promise<Review> {
        try {
            const headers = await getAuthHeaders();
            const responseData = await fetchWithAuth(`${API_URL}/api/reviews/${review_id}/response`, {
                method: "PUT",
                headers,
                body: JSON.stringify({ response }),
            });

            if (!responseData.ok) {
                const errorData = await responseData.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to add response: ${responseData.statusText}`);
            }

            return await responseData.json();
        } catch (error) {
            console.error("Error adding response:", error);
            throw error;
        }
    }

    static async delete(review_id: string): Promise<void> {
        try {
            const headers = await getAuthHeaders();
            const response = await fetchWithAuth(`${API_URL}/api/reviews/${review_id}`, {
                method: "DELETE",
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to delete review: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Error deleting review:", error);
            throw error;
        }
    }

    // Backward compatibility method
    static async filter(filters: Partial<Review>): Promise<Review[]> {
        if (filters.reviewee_id) {
            return await this.getByUser(filters.reviewee_id);
        }
        if (filters.item_id) {
            return await this.getByItem(filters.item_id);
        }
        return [];
    }
}
